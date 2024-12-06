import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import logger from '@/utils/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string

    if (!file || !folder) {
      return NextResponse.json(
        { error: 'File and folder are required' },
        { status: 400 }
      )
    }

    logger.info('Starting file upload to Supabase', {
      fileName: file.name,
      fileSize: file.size,
      folder
    })

    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { data, error } = await supabase.storage
      .from('try-on-images')
      .upload(filePath, file)

    if (error) {
      logger.error('Supabase upload failed', error)
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabase.storage
      .from('try-on-images')
      .getPublicUrl(filePath)

    logger.info('File upload successful', { publicUrl })

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    logger.error('Upload handler error', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
} 