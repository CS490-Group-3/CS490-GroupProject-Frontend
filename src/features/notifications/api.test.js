/**
 * Feature 15: Notifications
 * Tests notification functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as notificationsApi from './api.js'
import { api } from '../../shared/api/client.js'

vi.mock('../../shared/api/client.js')

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'appointment_reminder',
    title: 'Appointment Reminder',
    message: 'You have an appointment tomorrow at 10:00 AM',
    read: false,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'notif-2',
    type: 'promotion',
    title: 'Special Offer',
    message: 'Get 20% off your next visit!',
    read: true,
    created_at: '2024-01-14T10:00:00Z',
  },
]

describe('Feature 15: Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list notifications', async () => {
    api.mockResolvedValueOnce(mockNotifications)

    const result = await notificationsApi.getNotifications()

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(api).toHaveBeenCalledWith('/notifications/')
  })

  it('should get unread notification count', async () => {
    api.mockResolvedValueOnce({ unread: 1 })

    const result = await notificationsApi.getUnreadCount()

    expect(result).toBe(1)
    expect(api).toHaveBeenCalledWith('/notifications/unread-count')
  })

  it('should mark notification as read', async () => {
    api.mockResolvedValueOnce({ success: true })

    const result = await notificationsApi.markAsRead('notif-1')

    expect(result).toBeDefined()
    expect(api).toHaveBeenCalledWith(
      '/notifications/notif-1/mark-read',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })

  it('should mark all notifications as read', async () => {
    api.mockResolvedValueOnce({ success: true })

    const result = await notificationsApi.markAllAsRead()

    expect(result).toBeDefined()
    expect(api).toHaveBeenCalledWith(
      '/notifications/mark-all-read',
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })
})

