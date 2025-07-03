import html2canvas from 'html2canvas'
import GIF from 'gifshot'
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import type { Message } from '@/types/chat'

export function useShare() {
  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const downloadImage = async (container: HTMLElement) => {
    const originalScroll = container.scrollTop
    container.scrollTop = 0
    const canvas = await html2canvas(container, {
      width: 390,
      height: container.scrollHeight,
      windowWidth: 390,
    })
    container.scrollTop = originalScroll
    canvas.toBlob((blob: Blob | null) => {
      if (blob) downloadBlob(blob, 'chat.png')
    })
  }

  const downloadGif = async (container: HTMLElement) => {
    const totalHeight = container.scrollHeight
    const viewportHeight = container.clientHeight
    const frames: string[] = []
    const originalScroll = container.scrollTop
    for (let y = 0; y <= totalHeight - viewportHeight; y += 50) {
      container.scrollTop = y
      const canvas = await html2canvas(container, { width: 390 })
      frames.push(canvas.toDataURL('image/png'))
    }
    container.scrollTop = originalScroll
    return new Promise<void>((resolve, reject) => {
      GIF.createGIF(
        {
          images: frames,
          gifWidth: 390,
          gifHeight: viewportHeight,
          frameDuration: 0.5,
        },
        (obj: any) => {
          if (!obj.error && obj.image) {
            fetch(obj.image)
              .then((r) => r.blob())
              .then((b) => downloadBlob(b, 'chat.gif'))
              .then(() => resolve())
              .catch(reject)
          } else {
            reject(new Error('Failed to create GIF'))
          }
        }
      )
    })
  }

  const encodeMessages = (messages: Message[]) => {
    const toMinimal = (msg: Message): any => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      possibilities: msg.possibilities?.map(toMinimal),
    })
    const minimal = messages.map(toMinimal)
    const json = JSON.stringify(minimal)
    return compressToEncodedURIComponent(json)
  }

  const decodeMessages = (encoded: string): Message[] => {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return []
    const arr = JSON.parse(json)
    const toMessage = (data: any): Message => ({
      id: data.id,
      role: data.role,
      content: data.content,
      model: data.model,
      timestamp: new Date(),
      possibilities: data.possibilities?.map(toMessage),
    })
    return arr.map((m: any) => toMessage(m))
  }

  const copyShareUrl = (messages: Message[]) => {
    const encoded = encodeMessages(messages)
    const url = `${window.location.origin}?share=${encoded}`
    if (url.length > 2000) {
      alert('Conversation too long to share via URL.')
      return ''
    }
    navigator.clipboard.writeText(url)
    return url
  }

  const shareTo = (
    platform: 'linkedin' | 'x' | 'bluesky',
    imageUrl: string,
    url: string
  ) => {
    const text = encodeURIComponent(
      'Check this AI convo – endless possibilities made real!'
    )
    const encodedUrl = encodeURIComponent(url)
    if (platform === 'linkedin') {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        '_blank'
      )
    } else if (platform === 'x') {
      window.open(
        `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
        '_blank'
      )
    } else if (platform === 'bluesky') {
      window.open(
        `https://bsky.app/intent/compose?text=${text}%20${encodedUrl}`,
        '_blank'
      )
    }
  }

  return { downloadImage, downloadGif, copyShareUrl, shareTo, decodeMessages }
}
