import { NextRequest, NextResponse } from 'next/server'
import { VirtualTryonAPI } from '@/app/api/try-on/virtualTryonApi'

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    )
  }

  try {
    const api = new VirtualTryonAPI()
    const response = await api.queryTask(taskId)

    if (response.data.task_status === 'succeed') {
      return NextResponse.json({
        status: "success",
        generated_image_url: response.data.task_result?.images[0].url
      })
    } else if (response.data.task_status === 'failed') {
      return NextResponse.json(
        { 
          status: "failed",
          error: response.data.task_status_msg || 'Task failed'
        },
        { status: 500 }
      )
    } else {
      // Still processing
      return NextResponse.json(
        {
          status: "pending",
          message: "Task is still processing"
        },
        { status: 202 }
      )
    }
  } catch (error) {
    console.error('Error checking task status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check task status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 