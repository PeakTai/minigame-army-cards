export function sleep(millisecond: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, millisecond)
  })
}