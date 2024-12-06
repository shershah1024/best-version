// app/api/try-on/route.ts
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const API_BASE_URL = "https://api.klingai.com"

// Zod schema for request validation
const tryOnRequestSchema = z.object({
  human_image_url: z.string().url(),
  cloth_image_url: z.string().url(),
  callback_url: z.string().url().optional(),
  access_key: z.string().optional(),
  secret_key: z.string().optional(),
})

// Type inference from Zod schema
type TryOnRequest = z.infer<typeof tryOnRequestSchema>

// Response types based on API documentation
interface APIResponse {
  code: number
  message: string
  request_id: string
  data: {
    task_id: string
    task_status: 'submitted' | 'processing' | 'succeed' | 'failed'
    created_at: number
    updated_at: number
    task_status_msg?: string
    task_result?: {
      images: Array<{
        index: number
        url: string
      }>
    }
  }
}

class VirtualTryonAPI {
  private access_key: string
  private secret_key: string

  constructor(access_key: string | undefined, secret_key: string | undefined) {
    this.access_key = access_key || process.env.KLING_ACCESS_KEY || ''
    this.secret_key = secret_key || process.env.KLING_SECRET_KEY || ''

    if (!this.access_key || !this.secret_key) {
      throw new Error('API credentials not provided')
    }
  }

  private generateJWT(): string {
    const headers = {
      alg: "HS256",
      typ: "JWT"
    }

    const payload = {
      iss: this.access_key,
      exp: Math.floor(Date.now() / 1000) + 1800, // Current time + 30min
      nbf: Math.floor(Date.now() / 1000) - 5     // Current time - 5s
    }

    return jwt.sign(payload, this.secret_key, { header: headers })
  }

  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      const contentType = response.headers.get('content-type')
      
      if (!contentType?.startsWith('image/')) {
        throw new Error(`URL does not point to an image (content-type: ${contentType})`)
      }
      if (!response.ok) {
        throw new Error(`URL is not accessible (status code: ${response.status})`)
      }
      
      return true
    } catch (error) {
      throw new Error(`Error accessing URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.generateJWT()}`
    }
  }

  async createTask(
    human_image_url: string,
    cloth_image_url: string,
    callback_url?: string
  ): Promise<APIResponse> {
    // Validate image URLs
    await Promise.all([
      this.validateImageUrl(human_image_url),
      this.validateImageUrl(cloth_image_url)
    ])

    const payload = {
      model_name: "kolors-virtual-try-on-v1",
      human_image: human_image_url,
      cloth_image: cloth_image_url,
      ...(callback_url && { callback_url })
    }

    const response = await fetch(`${API_BASE_URL}/v1/images/kolors-virtual-try-on`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data: APIResponse = await response.json()
    
    if (data.code !== 0) {
      throw new Error(`API Error: ${data.message}`)
    }

    return data
  }

  async queryTask(task_id: string): Promise<APIResponse> {
    const response = await fetch(
      `${API_BASE_URL}/v1/images/kolors-virtual-try-on/${task_id}`,
      {
        headers: this.getHeaders()
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data: APIResponse = await response.json()
    
    if (data.code !== 0) {
      throw new Error(`API Error: ${data.message}`)
    }

    return data
  }

  async waitForCompletion(task_id: string): Promise<APIResponse> {
    const maxAttempts = 30 // 60 seconds total with 2-second interval
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await this.queryTask(task_id)
      const status = response.data.task_status

      if (status === 'succeed') {
        return response
      } else if (status === 'failed') {
        throw new Error(`Task failed: ${response.data.task_status_msg || 'Unknown error'}`)
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++
    }

    throw new Error(`Task ${task_id} timed out after 60 seconds`)
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    
    // Validate request body
    const validationResult = tryOnRequestSchema.safeParse(json)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { human_image_url, cloth_image_url, callback_url, access_key, secret_key } = validationResult.data

    // Initialize API client
    const api = new VirtualTryonAPI(access_key, secret_key)

    // Create task
    const createResponse = await api.createTask(human_image_url, cloth_image_url, callback_url)
    const task_id = createResponse.data.task_id

    // Wait for completion
    const tryOnResult = await api.waitForCompletion(task_id)

    return NextResponse.json({
      status: "success",
      task_id,
      generated_image_url: tryOnResult.data.task_result?.images[0].url
    })

  } catch (error) {
    console.error('Error in virtual try-on process:', error)
    
    return NextResponse.json(
      { 
        error: 'Virtual try-on failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}