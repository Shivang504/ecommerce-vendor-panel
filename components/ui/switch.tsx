"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: {
    root: "h-5 w-9",
    thumb: "size-3.5 data-[state=checked]:translate-x-[18px]",
  },
  md: {
    root: "h-6 w-11",
    thumb: "size-4 data-[state=checked]:translate-x-[22px]",
  },
  lg: {
    root: "h-8 w-14",
    thumb: "size-6 data-[state=checked]:translate-x-[26px]",
  },
};

type SwitchSize = "sm" | "md" | "lg";

function Switch({
  className,
  size = "md",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: SwitchSize;
}) {
  const current = sizeClasses[size];

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        `peer inline-flex shrink-0 items-center rounded-full transition-all duration-200 outline-none p-0.5
         data-[state=checked]:bg-green-500
         data-[state=unchecked]:bg-gray-300
         dark:data-[state=unchecked]:bg-gray-600
         focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background
         hover:data-[state=checked]:bg-green-600
         hover:data-[state=unchecked]:bg-gray-400 dark:hover:data-[state=unchecked]:bg-gray-500
         disabled:cursor-not-allowed disabled:opacity-50`,
        current.root,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          `pointer-events-none block rounded-full transition-transform duration-200 ease-in-out
           bg-white shadow-md
           data-[state=unchecked]:translate-x-0`,
          current.thumb
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };