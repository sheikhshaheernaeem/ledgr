"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-4 w-4 rounded border border-border bg-background accent-emerald-500 cursor-pointer",
        className
      )}
      {...props}
    />
  )
)
Checkbox.displayName = "Checkbox"
export { Checkbox }
