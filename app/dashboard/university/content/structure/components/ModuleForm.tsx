'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Trash2, Plus, X } from 'lucide-react'

type ModuleFormProps = {
  lessonId: string
  onCancel: () => void
  onSuccess: () => void
  existingModule?: {
    id: string
    title: string
    description: string
    content: string
    video_url: string | null
    video_required: boolean
    has_quiz: boolean
    quiz_questions: QuizQuestion[]
    sequence_order: number
  }
}

type QuizQuestion = {
  id?: string
  question_text: string
  options: string[]
  correct_answer: string
  question_type: 'multiple_choice' | 'true_false'
}

export default function ModuleForm({ lessonId, onCancel, onSuccess, existingModule }: ModuleFormProps) {
  const supabase = createClient()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [title, setTitle] = useState(existingModule?.title || '')
  const [description, setDescription] = useState(existingModule?.description || '')
  const [content, setContent] = useState(existingModule?.content || '')
  const [videoUrl, setVideoUrl] = useState(existingModule?.video_url || '')
  const [videoRequired, setVideoRequired] = useState(existingModule?.video_required || false)
  const [hasQuiz, setHasQuiz] = useState(existingModule?.has_quiz || false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    existingModule?.quiz_questions || []
  )
  
  // Add a default empty question if user enables quiz and no questions exist
  useEffect(() => {
    if (hasQuiz && quizQuestions.length === 0) {
      setQuizQuestions([{
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        question_type: 'multiple_choice'
      }])
    }
  }, [hasQuiz, quizQuestions.length])
  
  const addQuestion = () => {
    setQuizQuestions([
      ...quizQuestions, 
      {
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        question_type: 'multiple_choice'
      }
    ])
  }
  
  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index))
  }
  
  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updatedQuestions = [...quizQuestions]
    
    if (field === 'question_type') {
      // Reset options if changing between multiple choice and true/false
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        question_type: value,
        options: value === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
        correct_answer: ''
      }
    } else if (field === 'options') {
      const optionIndex = value.index
      const optionValue = value.value
      const currentOptions = [...updatedQuestions[index].options]
      currentOptions[optionIndex] = optionValue
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        options: currentOptions
      }
    } else {
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value
      }
    }
    
    setQuizQuestions(updatedQuestions)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    
    try {
      if (!title) {
        throw new Error('Title is required')
      }
      
      // Check quiz questions for completeness if quiz is enabled
      if (hasQuiz) {
        quizQuestions.forEach((question, index) => {
          if (!question.question_text) {
            throw new Error(`Question ${index + 1} text is missing`)
          }
          if (!question.correct_answer) {
            throw new Error(`Question ${index + 1} correct answer is missing`)
          }
          // For multiple choice, check that at least 2 options are provided
          if (question.question_type === 'multiple_choice' && 
              question.options.filter(opt => opt.trim()).length < 2) {
            throw new Error(`Question ${index + 1} needs at least 2 options`)
          }
        })
      }
      
      // Get the latest sequence order for the lesson
      const { data: modulesData } = await supabase
        .from('modules')
        .select('sequence_order')
        .eq('lesson_id', lessonId)
        .order('sequence_order', { ascending: false })
        .limit(1)
      
      const latestSequence = modulesData && modulesData.length > 0 
        ? modulesData[0].sequence_order + 1 
        : 1
      
      const moduleData = {
        title,
        description,
        content,
        video_url: videoUrl || null,
        video_required: videoRequired,
        has_quiz: hasQuiz,
        quiz_questions: hasQuiz ? quizQuestions : [],
        lesson_id: lessonId,
        sequence_order: existingModule?.sequence_order || latestSequence,
        status: 'draft' // Default to draft status
      }
      
      let response
      
      if (existingModule) {
        // Update existing module
        response = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', existingModule.id)
          .select()
      } else {
        // Create new module
        response = await supabase
          .from('modules')
          .insert(moduleData)
          .select()
      }
      
      if (response.error) {
        throw response.error
      }
      
      onSuccess()
    } catch (error: any) {
      console.error('Error saving module:', error)
      setFormError(error.message || 'Failed to save module')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        {existingModule ? 'Edit Module' : 'Create New Module'}
      </h2>
      
      {formError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Basic Module Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] h-20 text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] h-40 text-gray-900"
            />
          </div>
          
          {/* Video Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900"
              placeholder="https://example.com/video"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="videoRequired"
              checked={videoRequired}
              onChange={() => setVideoRequired(!videoRequired)}
              className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773] border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="videoRequired" className="ml-2 block text-sm text-gray-700 cursor-pointer">
              Video is required to complete module
            </label>
          </div>
          
          {/* Quiz Settings */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="hasQuiz"
                checked={hasQuiz}
                onChange={() => setHasQuiz(!hasQuiz)}
                className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773] border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="hasQuiz" className="text-sm font-medium text-gray-700">
                Include quiz for this module
              </label>
            </div>
            
            {hasQuiz && (
              <div className="mt-3 space-y-4 bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-medium text-gray-800">Quiz Questions</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="text-sm px-3 py-1 bg-[#AE9773] text-white rounded hover:bg-[#8E795D] flex items-center"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Question
                  </button>
                </div>
                
                {quizQuestions.map((question, questionIndex) => (
                  <div key={questionIndex} className="bg-white p-4 rounded-md border border-gray-300 relative">
                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      aria-label="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Type
                      </label>
                      <select
                        value={question.question_type}
                        onChange={(e) => updateQuestion(questionIndex, 'question_type', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                      </select>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question
                      </label>
                      <input
                        type="text"
                        value={question.question_text}
                        onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900"
                        placeholder="Enter your question"
                      />
                    </div>
                    
                    {question.question_type === 'multiple_choice' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Answer Options
                        </label>
                        {(question.options as string[]).map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center mb-2">
                            <input
                              type="radio"
                              id={`q${questionIndex}_opt${optionIndex}`}
                              name={`question${questionIndex}_correct`}
                              checked={question.correct_answer === option}
                              onChange={() => updateQuestion(questionIndex, 'correct_answer', option)}
                              className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773] border-gray-300 cursor-pointer"
                              disabled={!option.trim()}
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateQuestion(questionIndex, 'options', { index: optionIndex, value: e.target.value })}
                              className="ml-2 flex-1 p-2 bg-white border border-gray-300 rounded-md focus:ring-[#AE9773] focus:border-[#AE9773] text-gray-900"
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.question_type === 'true_false' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correct Answer
                        </label>
                        <div className="flex space-x-4">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id={`q${questionIndex}_true`}
                              name={`question${questionIndex}_correct_tf`}
                              checked={question.correct_answer === 'True'}
                              onChange={() => updateQuestion(questionIndex, 'correct_answer', 'True')}
                              className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773] border-gray-300 cursor-pointer"
                            />
                            <label htmlFor={`q${questionIndex}_true`} className="ml-2 text-sm text-gray-900 cursor-pointer">
                              True
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id={`q${questionIndex}_false`}
                              name={`question${questionIndex}_correct_tf`}
                              checked={question.correct_answer === 'False'}
                              onChange={() => updateQuestion(questionIndex, 'correct_answer', 'False')}
                              className="h-4 w-4 text-[#AE9773] focus:ring-[#AE9773] border-gray-300 cursor-pointer"
                            />
                            <label htmlFor={`q${questionIndex}_false`} className="ml-2 text-sm text-gray-900 cursor-pointer">
                              False
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Form Submit Buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#AE9773] text-white font-medium rounded-md hover:bg-[#8E795D] flex items-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                existingModule ? 'Update Module' : 'Create Module'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 