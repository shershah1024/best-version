'use client';

import React, { useState, useEffect } from 'react';
import { Camera, UploadCloud, RefreshCcw, Utensils, Flame, Heart, Apple, ChevronRight, Sparkles } from 'lucide-react';
import { NutritionData } from '../types/nutrition';
import { Button } from '@/app/components/ui/button';

export default function FoodTrackPage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<NutritionData | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setImageLoaded(false);
    const selectedFile = event.target.files?.[0];
    
    if (selectedFile) {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }

      if (selectedFile.type.startsWith('image/')) {
        if (selectedFile.size > 10 * 1024 * 1024) {
          setError('Image size too large. Please choose an image under 10MB.');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setCapturedImage(dataUrl);
          setFile(selectedFile);
        };
        reader.onerror = () => {
          setError('Error reading file. Please try again.');
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setError('Please select a valid image file');
      }
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleUpload = async () => {
    if (!capturedImage || !file) {
      setError('No image selected');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      if (file.type.startsWith('image/')) {
        formData.append('image', file);
      } else {
        throw new Error('Invalid file type');
      }
      
      formData.append('userEmail', 'test@example.com');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setAnalysisResult(result.nutritionData);
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setFile(null);
    setError(null);
    setAnalysisResult(null);
  };

  const MobileLayout = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-10 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Food Track
          </h1>
        </div>
      </div>

      <div className="pt-16 pb-4">
        {error && (
          <div className="mx-4 mb-4 bg-red-50 border-l-4 border-red-400 p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {!capturedImage ? (
          <div className="px-4">
            <div className="relative h-[70vh] rounded-3xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-100 overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapture}
                className="hidden"
                id="camera-input"
                multiple={false}
                max="1"
              />
              <label
                htmlFor="camera-input"
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                  <Camera className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Take a Photo
                </h2>
                <p className="text-gray-600 text-center px-8">
                  Snap a picture of your meal to get instant nutritional insights
                </p>
              </label>
            </div>
          </div>
        ) : (
          <div>
            <div className="relative h-[40vh]">
              <img 
                src={capturedImage} 
                alt="Food" 
                className="w-full h-full object-cover"
                onLoad={handleImageLoad}
              />
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <div className="flex justify-between items-center">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="sm"
                    className="bg-white/20 backdrop-blur-md border-white/40 text-white hover:text-white hover:bg-white/30"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !imageLoaded}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        <span>Analyzing...</span>
                      </>
                    ) : !imageLoaded ? (
                      <span>Loading image...</span>
                    ) : (
                      <>
                        <span>Analyze</span>
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {analysisResult && (
              <div className="px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-100 flex items-center justify-center">
                    <Apple className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {analysisResult.dish_name}
                  </h2>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Nutrition Facts</h3>
                  <div className="space-y-3">
                    {analysisResult.macronutrients.calories != null && (
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-100 p-4 rounded-2xl">
                        <Flame className="w-5 h-5 text-blue-600 mb-1" />
                        <p className="text-2xl font-bold text-blue-900">
                          {analysisResult.macronutrients.calories}
                        </p>
                        <p className="text-sm text-blue-700">Calories</p>
                      </div>
                    )}
                    
                    {analysisResult.macronutrients.protein?.grams != null && (
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                        <span className="text-gray-700">Protein</span>
                        <div className="text-right">
                          <span className="font-semibold text-blue-900">{analysisResult.macronutrients.protein.grams}g</span>
                          {analysisResult.macronutrients.protein.daily_value_percentage && (
                            <p className="text-sm text-gray-500">{analysisResult.macronutrients.protein.daily_value_percentage}% DV</p>
                          )}
                        </div>
                      </div>
                    )}

                    {analysisResult.macronutrients.carbohydrates?.total != null && (
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                        <span className="text-gray-700">Carbs</span>
                        <div className="text-right">
                          <span className="font-semibold text-blue-900">{analysisResult.macronutrients.carbohydrates.total}g</span>
                          {analysisResult.macronutrients.carbohydrates.fiber != null && (
                            <p className="text-sm text-gray-500">{analysisResult.macronutrients.carbohydrates.fiber}g Fiber</p>
                          )}
                        </div>
                      </div>
                    )}

                    {analysisResult.macronutrients.fats?.total != null && (
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                        <span className="text-gray-700">Fats</span>
                        <div className="text-right">
                          <span className="font-semibold text-blue-900">{analysisResult.macronutrients.fats.total}g</span>
                          {analysisResult.macronutrients.fats.saturated != null && (
                            <p className="text-sm text-gray-500">{analysisResult.macronutrients.fats.saturated}g Saturated</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900">Health Insights</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {analysisResult.health_metrics.detailed_reasoning}
                  </p>
                </div>

                {/* Detailed Health Score Components */}
                {analysisResult.health_metrics.calculated_health_scores && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900">Health Score Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(analysisResult.health_metrics.calculated_health_scores.component_scores).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                          <span className="text-gray-700">{key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                          <span className="font-semibold text-blue-900">{value.toFixed(1)}/100</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                      {analysisResult.health_metrics.calculated_health_scores.score_explanation}
                    </p>
                  </div>
                )}

                {/* Ingredients List */}
                {analysisResult.ingredients && analysisResult.ingredients.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900">Ingredients</h3>
                    <div className="space-y-2">
                      {analysisResult.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                          <span className="text-gray-700">{ingredient.name}</span>
                          {ingredient.estimated_amount && (
                            <span className="text-sm text-gray-500">{ingredient.estimated_amount}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Micronutrients */}
                {analysisResult.micronutrients && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900">Vitamins & Minerals</h3>
                    
                    {/* Vitamins */}
                    {analysisResult.micronutrients.vitamins && Object.keys(analysisResult.micronutrients.vitamins).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Vitamins</h4>
                        {Object.entries(analysisResult.micronutrients.vitamins).map(([vitamin, amount]) => (
                          amount && (
                            <div key={vitamin} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                              <span className="text-gray-700">Vitamin {vitamin.toUpperCase()}</span>
                              <span className="font-semibold text-blue-900">{amount}mcg</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    
                    {/* Minerals */}
                    {analysisResult.micronutrients.minerals && Object.keys(analysisResult.micronutrients.minerals).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Minerals</h4>
                        {Object.entries(analysisResult.micronutrients.minerals).map(([mineral, amount]) => (
                          amount && (
                            <div key={mineral} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl">
                              <span className="text-gray-700">{mineral.charAt(0).toUpperCase() + mineral.slice(1)}</span>
                              <span className="font-semibold text-blue-900">{amount}mg</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

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
                Food Track
              </h1>
              <p className="text-gray-600">Analyze your food's nutritional value instantly</p>
            </div>
          </div>
          {capturedImage && !analysisResult && (
            <Button
              onClick={handleUpload}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
              disabled={uploading || !imageLoaded}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Analyzing...
                </>
              ) : !imageLoaded ? (
                <span>Loading image...</span>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 mr-2" />
                  Analyze Photo
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-5">
            {!capturedImage ? (
              <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl border border-blue-100 overflow-hidden shadow-lg">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCapture}
                  className="hidden"
                  id="camera-input"
                  multiple={false}
                  max="1"
                />
                <label
                  htmlFor="camera-input"
                  className="relative block aspect-[4/3] cursor-pointer group"
                >
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-8">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                      <Camera className="w-16 h-16 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Upload a Photo
                    </h2>
                    <p className="text-gray-600 text-center">
                      Take or upload a picture of your meal to get detailed nutritional analysis
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden shadow-lg border border-blue-100">
                <img 
                  src={capturedImage} 
                  alt="Food" 
                  className="w-full aspect-[4/3] object-cover"
                  onLoad={handleImageLoad}
                />
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border-white/40 text-white hover:text-white"
                >
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="col-span-7 bg-white rounded-3xl shadow-lg border border-blue-100 p-8">
              <div className="flex items-center gap-4 pb-6 mb-6 border-b border-blue-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-100 flex items-center justify-center">
                  <Utensils className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {analysisResult.dish_name}
                  </h2>
                  <p className="text-gray-500">Nutritional Analysis</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-100 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Flame className="w-6 h-6 text-blue-600" />
                    <span className="font-medium text-blue-900">Calories</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">
                    {analysisResult.macronutrients.calories}
                  </p>
                </div>

                {analysisResult.health_metrics.health_score != null && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Heart className="w-6 h-6 text-purple-600" />
                      <span className="font-medium text-purple-900">Health Score</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">
                      {analysisResult.health_metrics.health_score.toFixed(2)}/100
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                {analysisResult.macronutrients.protein?.grams != null && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6">
                    <h3 className="text-gray-700 mb-2">Protein</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysisResult.macronutrients.protein.grams}g
                    </p>
                    {analysisResult.macronutrients.protein.daily_value_percentage != null && (
                      <p className="text-sm text-gray-500">
                        {analysisResult.macronutrients.protein.daily_value_percentage}% Daily Value
                      </p>
                    )}
                  </div>
                )}

                {analysisResult.macronutrients.carbohydrates?.total != null && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6">
                    <h3 className="text-gray-700 mb-2">Carbs</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysisResult.macronutrients.carbohydrates.total}g
                    </p>
                    {analysisResult.macronutrients.carbohydrates.fiber != null && (
                      <p className="text-sm text-gray-500">
                        {analysisResult.macronutrients.carbohydrates.fiber}g Fiber
                      </p>
                    )}
                  </div>
                )}

                {analysisResult.macronutrients.fats?.total != null && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6">
                    <h3 className="text-gray-700 mb-2">Fats</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {analysisResult.macronutrients.fats.total}g
                    </p>
                    {analysisResult.macronutrients.fats.saturated != null && (
                      <p className="text-sm text-gray-500">
                        {analysisResult.macronutrients.fats.saturated}g Saturated
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Health Insights</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {analysisResult.health_metrics.detailed_reasoning}
                </p>

                {/* Detailed Health Score Components */}
                {analysisResult.health_metrics.calculated_health_scores && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Health Score Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(analysisResult.health_metrics.calculated_health_scores.component_scores).map(([key, value]) => (
                        <div key={key} className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-4">
                          <h4 className="text-gray-700 mb-2">{key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h4>
                          <p className="text-2xl font-bold text-gray-900">{value.toFixed(1)}/100</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-600 mt-4 whitespace-pre-line">
                      {analysisResult.health_metrics.calculated_health_scores.score_explanation}
                    </p>
                  </div>
                )}

                {/* Ingredients List */}
                {analysisResult.ingredients && analysisResult.ingredients.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {analysisResult.ingredients.map((ingredient, index) => (
                        <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-4">
                          <h4 className="text-gray-700 mb-1">{ingredient.name}</h4>
                          {ingredient.estimated_amount && (
                            <p className="text-sm text-gray-500">{ingredient.estimated_amount}</p>
                          )}
                          {ingredient.allergen && (
                            <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Allergen
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Micronutrients */}
                {analysisResult.micronutrients && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Vitamins & Minerals</h3>
                    <div className="grid grid-cols-2 gap-8">
                      {/* Vitamins */}
                      {analysisResult.micronutrients.vitamins && Object.keys(analysisResult.micronutrients.vitamins).length > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Vitamins</h4>
                          <div className="space-y-3">
                            {Object.entries(analysisResult.micronutrients.vitamins).map(([vitamin, amount]) => (
                              amount && (
                                <div key={vitamin} className="flex justify-between items-center">
                                  <span className="text-gray-700">Vitamin {vitamin.toUpperCase()}</span>
                                  <span className="font-semibold text-blue-900">{amount}mcg</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Minerals */}
                      {analysisResult.micronutrients.minerals && Object.keys(analysisResult.micronutrients.minerals).length > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Minerals</h4>
                          <div className="space-y-3">
                            {Object.entries(analysisResult.micronutrients.minerals).map(([mineral, amount]) => (
                              amount && (
                                <div key={mineral} className="flex justify-between items-center">
                                  <span className="text-gray-700">{mineral.charAt(0).toUpperCase() + mineral.slice(1)}</span>
                                  <span className="font-semibold text-blue-900">{amount}mg</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
} 