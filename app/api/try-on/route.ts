// app/api/try-on/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { VirtualTryonAPI } from './virtualTryonApi'

export const maxDuration = 300; // Maximum execution time in seconds

// Zod schema for request validation
const tryOnRequestSchema = z.object({
  human_image_url: z.string().url(),
  cloth_image_url: z.string().url(),
  callback_url: z.string().url().optional(),
  access_key: z.string().optional(),
  secret_key: z.string().optional(),
})

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

    // Create task with timeout handling
    let createResponse
    try {
      createResponse = await api.createTask(human_image_url, cloth_image_url, callback_url)
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        return NextResponse.json(
          { error: 'Task creation timed out. Please try again.' },
          { status: 504 }
        )
      }
      throw error
    }

    const task_id = createResponse.data.task_id

    // Wait for completion with extended timeout
    try {
      const tryOnResult = await api.waitForCompletion(task_id, 120000) // 2 minutes max wait
      return NextResponse.json({
        status: "success",
        task_id,
        generated_image_url: tryOnResult.data.task_result?.images[0].url
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        return NextResponse.json({
          status: "pending",
          task_id,
          message: "Task is still processing. Please try checking the status again."
        }, { status: 202 })
      }
      throw error
    }

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