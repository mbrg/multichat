export default async function html2canvas(
  element: HTMLElement
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  const rect = element.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = window.getComputedStyle(element).backgroundColor || '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  return canvas
}
