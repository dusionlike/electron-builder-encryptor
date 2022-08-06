import { describe, expect, it } from 'vitest'
import { md5Salt } from '../src/encrypt'

describe('index', () => {
  it('md5Salt', () => {
    expect(md5Salt('123')).toEqual('a626420432431ad3fda14f9e5155c502')
    expect(md5Salt('fdsfcsfsd1561561ds651f65ds1f65dsf6516zfeffeffsf')).toEqual(
      '8f0432b0044d25b610f5efddc0d9ec13'
    )
  })
})
