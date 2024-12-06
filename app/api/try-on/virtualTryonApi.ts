import jwt from 'jsonwebtoken'

const API_BASE_URL = "https://api.klingai.com"

// Response types based on API documentation
export interface APIResponse {
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

export class VirtualTryonAPI {
  private access_key: string
  private secret_key: string

  constructor(access_key?: string, secret_key?: string) {
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type')
      
      if (!contentType?.startsWith('image/')) {
        throw new Error(`URL does not point to an image (content-type: ${contentType})`)
      }
      if (!response.ok) {
        throw new Error(`URL is not accessible (status code: ${response.status})`)
      }
      
      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Image URL validation timed out')
      }
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
    // Validate image URLs with timeout
    try {
      await Promise.all([
        this.validateImageUrl(human_image_url),
        this.validateImageUrl(cloth_image_url)
      ])
    } catch (error) {
      throw new Error(`Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const payload = {
      model_name: "kolors-virtual-try-on-v1",
      human_image: human_image_url,
      cloth_image: cloth_image_url,
      ...(callback_url && { callback_url })
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/kolors-virtual-try-on`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data: APIResponse = await response.json()
      
      if (data.code !== 0) {
        throw new Error(`API Error: ${data.message}`)
      }

      return data
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Task creation timed out')
      }
      throw error
    }
  }

  async queryTask(task_id: string): Promise<APIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/images/kolors-virtual-try-on/${task_id}`,
        {
          headers: this.getHeaders(),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data: APIResponse = await response.json()
      
      if (data.code !== 0) {
        throw new Error(`API Error: ${data.message}`)
      }

      return data
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Task query timed out')
      }
      throw error
    }
  }

  async waitForCompletion(task_id: string, maxWaitTime = 120000): Promise<APIResponse> {
    const startTime = Date.now()
    const interval = 3000 // 3 seconds between checks

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.queryTask(task_id)
        const status = response.data.task_status

        if (status === 'succeed') {
          return response
        } else if (status === 'failed') {
          throw new Error(`Task failed: ${response.data.task_status_msg || 'Unknown error'}`)
        }

        // If still processing, wait before next check
        await new Promise(resolve => setTimeout(resolve, interval))
      } catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
          // If it's a timeout error, continue trying
          continue
        }
        throw error
      }
    }

    throw new Error(`Task ${task_id} timed out after ${maxWaitTime/1000} seconds`)
  }
} 