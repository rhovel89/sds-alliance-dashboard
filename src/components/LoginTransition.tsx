import { ReactNode } from 'react'
import '../styles/transition.css'

export default function LoginTransition({ children }: { children: ReactNode }) {
  return (
    <div className='login-transition'>
      {children}
    </div>
  )
}
