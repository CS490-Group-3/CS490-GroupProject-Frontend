/**
 * Feature 11: Shop/Product Browsing
 * Feature 12: Cart Management
 * Tests shop and cart functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as shopApi from './api.js'
import { api } from '../../shared/api/client.js'

vi.mock('../../shared/api/client.js')

const mockProducts = [
  { id: '1', name: 'Hair Gel', price: 15.99, salon_id: 'salon-1' },
  { id: '2', name: 'Shampoo', price: 12.99, salon_id: 'salon-1' },
]

const mockCart = {
  id: 'cart-1',
  items: [
    { product_id: '1', quantity: 2, product: mockProducts[0] },
  ],
  total: 31.98,
}

describe('Feature 11-12: Shop and Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list products for a salon', async () => {
    api.mockResolvedValueOnce({ products: mockProducts })

    const result = await shopApi.listProducts('salon-1')

    expect(result).toBeDefined()
    expect(result.products).toBeDefined()
    expect(api).toHaveBeenCalledWith('/products?salon_id=salon-1')
  })

  it('should get a product by ID', async () => {
    api.mockResolvedValueOnce({ product: mockProducts[0] })

    const result = await shopApi.getProduct('1')

    expect(result).toBeDefined()
    expect(result.product).toEqual(mockProducts[0])
    expect(api).toHaveBeenCalledWith('/products/1')
  })

  it('should list products with category filter', async () => {
    api.mockResolvedValueOnce({ products: mockProducts })

    const result = await shopApi.listProducts('salon-1', ['cat-1', 'cat-2'])

    expect(result).toBeDefined()
    expect(result.products).toBeDefined()
    expect(api).toHaveBeenCalledWith('/products?salon_id=salon-1&category_id=cat-1&category_id=cat-2')
  })

  it('should handle product listing errors', async () => {
    api.mockRejectedValueOnce(new Error('Failed to fetch'))

    await expect(shopApi.listProducts('salon-1')).rejects.toThrow()
  })

  it('should handle product retrieval errors', async () => {
    api.mockRejectedValueOnce(new Error('Product not found'))

    await expect(shopApi.getProduct('999')).rejects.toThrow()
  })
})

