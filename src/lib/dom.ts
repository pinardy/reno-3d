/**
 * Whether an event came from somewhere the user is typing, so global keyboard
 * shortcuts should leave the key alone.
 */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}
