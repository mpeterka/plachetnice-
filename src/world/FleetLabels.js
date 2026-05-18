export function labelFontSize(ctx, name, maxWidth, initialSize = 44, minSize = 24) {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(name).width <= maxWidth) return size;
    size -= 1;
  }
  return minSize;
}
