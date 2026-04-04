import { useQuery, useMutation, useQueryClient } from 'react-query'
import { linksApi } from '../services/api'
import toast from 'react-hot-toast'

export function useLinks(params = {}) {
  return useQuery(
    ['links', params],
    async () => {
      const { data } = await linksApi.list(params)
      return data
    },
    {
      keepPreviousData: true,
      staleTime: 30000,
    }
  )
}

export function useLink(id) {
  return useQuery(
    ['link', id],
    async () => {
      const { data } = await linksApi.get(id)
      return data
    },
    {
      enabled: !!id,
      staleTime: 15000,
    }
  )
}

export function useCreateLink() {
  const qc = useQueryClient()

  return useMutation(
    async (data) => {
      const { data: res } = await linksApi.create(data)
      return res
    },
    {
      onSuccess: (data) => {
        qc.invalidateQueries(['links'])
        toast.success(`Link created: ${data.link.shortCode}`)
      },
      onError: (err) => {
        const msg = err.response?.data?.error || 'Failed to create link'
        toast.error(msg)
      },
    }
  )
}

export function useUpdateLink() {
  const qc = useQueryClient()

  return useMutation(
    async ({ id, ...data }) => {
      const { data: res } = await linksApi.update(id, data)
      return res
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['links'])
        toast.success('Link updated')
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Failed to update link')
      },
    }
  )
}

export function useDeleteLink() {
  const qc = useQueryClient()

  return useMutation(
    async (id) => {
      await linksApi.delete(id)
      return id
    },
    {
      onSuccess: () => {
        qc.invalidateQueries(['links'])
        toast.success('Link deleted')
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Failed to delete link')
      },
    }
  )
}
