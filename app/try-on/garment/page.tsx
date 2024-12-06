'use client'

import React, { useState, useEffect } from 'react'
import { Camera, RefreshCcw, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { useRouter } from 'next/navigation'
import logger from '@/utils/logger'

export default function GarmentPage() {
  const [humanImage, setHumanImage] = useState<string | null>(null)
  const [capturedClothImage, setCapturedClothImage] = useState<string | null>(null)
  const [clothFile, setClothFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    logger.info('Garment page mounted')
    const storedHumanImage = localStorage.getItem('humanImage')
    if (!storedHumanImage) {
      logger.warn('No human image found in storage, redirecting to human upload')
      router.push('/try-on/human')
    } else {
      logger.info('Human image retrieved from storage')
      setHumanImage(storedHumanImage)
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleClothCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    logger.info('Starting garment image capture')
    const selectedFile = event.target.files?.[0]
    
    if (!selectedFile) {
      logger.warn('No file selected for garment image')
      return
    }
    
    logger.info('Garment image file selected', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type
    })
    
    if (capturedClothImage) {
      logger.info('Revoking previous garment image URL')
      URL.revokeObjectURL(capturedClothImage)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      logger.info('Garment image file read complete')
      const dataUrl = e.target?.result as string
      setCapturedClothImage(dataUrl)
      setClothFile(selectedFile)
      setImageLoaded(false)
    }

    reader.onerror = (error) => {
      logger.error('Error reading garment image file', error)
    }

    logger.info('Starting to read garment image file')
    reader.readAsDataURL(selectedFile)
    event.target.value = ''
  }

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    logger.info('Resetting garment image')
    if (capturedClothImage) {
      logger.info('Revoking garment image URL')
      URL.revokeObjectURL(capturedClothImage)
    }
    setCapturedClothImage(null)
    setClothFile(null)
    setImageLoaded(false)
    setError(null)
  }

  const handleUpload = async () => {
    if (!humanImage || !clothFile) {
      const error = 'Please select both images'
      logger.warn('Upload attempted without required images', {
        hasHumanImage: !!humanImage,
        hasClothFile: !!clothFile
      })
      setError(error)
      return
    }

    setUploading(true)
    const processStart = Date.now()
    logger.info('Starting try-on process')

    try {
      // Create File object from base64 human image
      logger.info('Converting human image from base64 to File')
      const humanBlob = await fetch(humanImage).then(r => r.blob())
      const humanFile = new File([humanBlob], 'human.jpg', { type: 'image/jpeg' })

      // Upload human image
      logger.info('Preparing human image upload')
      const humanFormData = new FormData()
      humanFormData.append('file', humanFile)
      humanFormData.append('folder', 'human-images')

      // Upload cloth image
      logger.info('Preparing garment image upload')
      const clothFormData = new FormData()
      clothFormData.append('file', clothFile)
      clothFormData.append('folder', 'cloth-images')

      // Upload both images concurrently
      logger.info('Starting concurrent image uploads')
      const [humanResponse, clothResponse] = await Promise.all([
        fetch('/api/upload', { method: 'POST', body: humanFormData }),
        fetch('/api/upload', { method: 'POST', body: clothFormData })
      ])

      if (!humanResponse.ok || !clothResponse.ok) {
        const errorData = await Promise.all([
          humanResponse.json().catch(() => ({})),
          clothResponse.json().catch(() => ({}))
        ])
        logger.error('Image upload failed', {
          humanStatus: humanResponse.status,
          clothStatus: clothResponse.status,
          errorData
        })
        throw new Error('Failed to upload images')
      }

      const [humanData, clothData] = await Promise.all([
        humanResponse.json(),
        clothResponse.json()
      ])

      logger.info('Images uploaded successfully', {
        humanImageUrl: humanData.url,
        clothImageUrl: clothData.url,
        uploadDuration: `${Date.now() - processStart}ms`
      })

      // Call try-on API
      logger.info('Starting try-on API call')
      const tryOnResponse = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_image_url: humanData.url,
          cloth_image_url: clothData.url
        })
      })

      if (!tryOnResponse.ok) {
        const error = await tryOnResponse.json()
        logger.error('Try-on API call failed', {
          status: tryOnResponse.status,
          error
        })
        throw new Error(error.message || 'Failed to generate try-on image')
      }

      const result = await tryOnResponse.json()
      setResultImageUrl(result.generated_image_url)

      logger.info('Try-on process completed successfully', {
        totalDuration: `${Date.now() - processStart}ms`,
        resultUrl: result.generated_image_url
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process images'
      logger.error('Try-on process failed', {
        error: err,
        duration: `${Date.now() - processStart}ms`
      })
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const MobileLayout = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-10 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logger.info('Navigating back to human image upload')
              router.push('/try-on/human')
            }}
            className="mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Select Garment
          </h1>
        </div>
      </div>

      <div className="pt-16 pb-4">
        {error && (
          <div className="mx-4 mb-4 bg-red-50 border-l-4 border-red-400 p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="px-4 space-y-4">
          {humanImage && (
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-blue-100">
              <img
                src={humanImage}
                alt="Selected person"
                className="w-full h-full object-cover"
                onLoad={() => logger.info('Human image preview loaded')}
              />
            </div>
          )}

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleClothCapture}
              className="hidden"
              id="cloth-image-input-mobile"
            />
            <label htmlFor="cloth-image-input-mobile" className="block">
              <div className="relative aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-100 overflow-hidden">
                {capturedClothImage ? (
                  <>
                    <img
                      src={capturedClothImage}
                      alt="Garment"
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        logger.info('Garment image preview loaded')
                        setImageLoaded(true)
                      }}
                    />
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      className="absolute top-4 right-4 bg-white/20 backdrop-blur-md"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-gray-600 text-center">
                      Upload a photo of the garment
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!clothFile || !imageLoaded || uploading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            onMouseEnter={() => {
              logger.info('Generate button state', {
                hasClothFile: !!clothFile,
                imageLoaded,
                uploading,
                isDisabled: !clothFile || !imageLoaded || uploading
              })
            }}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Generating...
              </>
            ) : (
              'Generate Try-On'
            )}
          </Button>

          {resultImageUrl && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Result:</h2>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-blue-100">
                <img
                  src={resultImageUrl}
                  alt="Try-on result"
                  className="w-full h-full object-cover"
                  onLoad={() => logger.info('Result image loaded')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const DesktopLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                logger.info('Navigating back to human image upload')
                router.push('/try-on/human')
              }}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                Select Garment
              </h1>
              <p className="text-gray-600">Step 2: Choose the garment you want to try on</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          {humanImage && (
            <div className="col-span-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-blue-100">
                <img
                  src={humanImage}
                  alt="Selected person"
                  className="w-full h-full object-cover"
                  onLoad={() => logger.info('Human image preview loaded')}
                />
              </div>
            </div>
          )}

          <div className="col-span-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleClothCapture}
              className="hidden"
              id="cloth-image-input"
            />
            <label htmlFor="cloth-image-input" className="block">
              <div className="relative aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-100 overflow-hidden group">
                {capturedClothImage ? (
                  <>
                    <img
                      src={capturedClothImage}
                      alt="Garment"
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        logger.info('Garment image preview loaded')
                        setImageLoaded(true)
                      }}
                    />
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      className="absolute top-4 right-4 bg-white/20 backdrop-blur-md"
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                      <Camera className="w-16 h-16 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Upload Garment
                    </h2>
                    <p className="text-gray-600 text-center">
                      Upload a photo of the garment you want to try on
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {resultImageUrl && (
            <div className="col-span-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-blue-100">
                <img
                  src={resultImageUrl}
                  alt="Try-on result"
                  className="w-full h-full object-cover"
                  onLoad={() => logger.info('Result image loaded')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={!clothFile || !imageLoaded || uploading}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8"
            size="lg"
            onMouseEnter={() => {
              logger.info('Generate button state', {
                hasClothFile: !!clothFile,
                imageLoaded,
                uploading,
                isDisabled: !clothFile || !imageLoaded || uploading
              })
            }}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Generating...
              </>
            ) : (
              'Generate Try-On'
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  return isMobile ? <MobileLayout /> : <DesktopLayout />
} 