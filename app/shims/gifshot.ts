const GIF = {
  createGIF(
    options: any,
    cb: (result: { error: boolean; image?: string }) => void
  ) {
    const canvas = document.createElement('canvas')
    canvas.width = options.gifWidth || 1
    canvas.height = options.gifHeight || 1
    cb({ error: false, image: canvas.toDataURL('image/gif') })
  },
}
export default GIF
