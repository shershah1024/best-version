'use client'

import React, { useState, useEffect } from 'react'
import { Camera, RefreshCcw, Sparkles } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { useRouter } from 'next/navigation'
import logger from '@/utils/logger'

export default function HumanImagePage() {
  const [capturedHumanImage, setCapturedHumanImage] = useState<string | null>(null)
  const [humanFile, setHumanFile] = useState<File | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    logger.info('Human image page mounted')
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleHumanCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    logger.info('Starting human image capture')
    const selectedFile = event.target.files?.[0]
    
    if (!selectedFile) {
      logger.warn('No file selected for human image')
      return
    }
    
    logger.info('Human image file selected', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type
    })
    
    if (capturedHumanImage) {
      logger.info('Revoking previous human image URL')
      URL.revokeObjectURL(capturedHumanImage)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      logger.info('Human image file read complete')
      const dataUrl = e.target?.result as string
      setCapturedHumanImage(dataUrl)
      setHumanFile(selectedFile)
      setImageLoaded(false)
    }

    reader.onerror = (error) => {
      logger.error('Error reading human image file', error)
    }

    logger.info('Starting to read human image file')
    reader.readAsDataURL(selectedFile)
    event.target.value = ''
  }

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    logger.info('Resetting human image')
    if (capturedHumanImage) {
      logger.info('Revoking human image URL')
      URL.revokeObjectURL(capturedHumanImage)
    }
    setCapturedHumanImage(null)
    setHumanFile(null)
    setImageLoaded(false)
  }

  const handleContinue = () => {
    if (capturedHumanImage) {
      logger.info('Storing human image and proceeding to garment selection')
      try {
        localStorage.setItem('humanImage', capturedHumanImage)
        logger.info('Human image stored successfully')
        router.push('/try-on/garment')
      } catch (error) {
        logger.error('Error storing human image', error)
      }
    } else {
      logger.warn('Attempted to continue without human image')
    }
  }

  const MobileLayout = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-10 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Upload Your Photo
          </h1>
        </div>
      </div>

      <div className="pt-16 pb-4">
        <div className="px-4 space-y-4">
          <div>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleHumanCapture}
              className="hidden"
              id="human-image-input-mobile"
            />
            <label htmlFor="human-image-input-mobile" className="block">
              <div className="relative aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-100 overflow-hidden">
                {capturedHumanImage ? (
                  <>
                    <img
                      src={capturedHumanImage}
                      alt="Person"
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        logger.info('Human image preview loaded')
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
                      Take or upload a photo of yourself
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!humanFile || !imageLoaded}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            onMouseEnter={() => {
              logger.info('Continue button state', {
                hasHumanFile: !!humanFile,
                imageLoaded,
                isDisabled: !humanFile || !imageLoaded
              })
            }}
          >
            Continue to Garment Selection
          </Button>
        </div>
      </div>
    </div>
  )

  const DesktopLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                Upload Your Photo
              </h1>
              <p className="text-gray-600">Step 1: Take or upload a photo of yourself</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <input
            type="file"
            accept="image/*"
            onChange={handleHumanCapture}
            className="hidden"
            id="human-image-input"
          />
          <label htmlFor="human-image-input" className="block">
            <div className="relative aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-100 overflow-hidden group">
              {capturedHumanImage ? (
                <>
                  <img
                    src={capturedHumanImage}
                    alt="Person"
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      logger.info('Human image preview loaded')
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
                    Upload Your Photo
                  </h2>
                  <p className="text-gray-600 text-center">
                    Take or upload a photo of yourself
                  </p>
                </div>
              )}
            </div>
          </label>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleContinue}
              disabled={!humanFile || !imageLoaded}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8"
              size="lg"
              onMouseEnter={() => {
                logger.info('Continue button state', {
                  hasHumanFile: !!humanFile,
                  imageLoaded,
                  isDisabled: !humanFile || !imageLoaded
                })
              }}
            >
              Continue to Garment Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return isMobile ? <MobileLayout /> : <DesktopLayout />
} 