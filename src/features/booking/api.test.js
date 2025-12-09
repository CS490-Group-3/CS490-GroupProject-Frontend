/**
 * Feature 9: Review Creation
 * Feature 10: Review Update
 * Tests review functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as bookingApi from './api.js'
import { api } from '../../shared/api/client.js'

vi.mock('../../shared/api/client.js')

describe('Feature 9-10: Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a review', async () => {
    const mockReview = {
      id: 'review-1',
      appointment_id: 'appt-1',
      rating: 5,
      comment: 'Great service!',
    }

    api.mockResolvedValueOnce(mockReview)

    const result = await bookingApi.submitReview('appt-1', {
      stars: 5,
      comment: 'Great service!',
    })

    expect(result).toEqual(mockReview)
    expect(api).toHaveBeenCalledWith(
      '/reviews/',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should update a review', async () => {
    const mockUpdatedReview = {
      id: 'review-1',
      rating: 4,
      comment: 'Updated comment',
    }

    api.mockResolvedValueOnce(mockUpdatedReview)

    const result = await bookingApi.updateReview('review-1', {
      stars: 4,
      comment: 'Updated comment',
    })

    expect(result).toEqual(mockUpdatedReview)
    expect(api).toHaveBeenCalledWith(
      '/reviews/review-1',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })

  it('should get salon reviews', async () => {
    const mockReviews = [
      { id: '1', rating: 5, comment: 'Great!' },
      { id: '2', rating: 4, comment: 'Good service' },
    ]

    api.mockResolvedValueOnce({ reviews: mockReviews })

    const result = await bookingApi.getSalonReviews('salon-1')

    expect(result).toEqual(mockReviews)
    expect(api).toHaveBeenCalledWith('/salons/salon-1/reviews?limit=1000')
  })
})

