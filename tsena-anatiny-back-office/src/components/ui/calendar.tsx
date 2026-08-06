import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full p-3", className)}
      classNames={{
        months: "w-full",
        month_caption: "mb-2 flex items-center justify-between",
        caption_label: "text-base font-semibold text-ink",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8"
        ),
        month_grid: "w-full border-collapse",
        weekday:
          "h-9 text-center text-xs font-semibold uppercase tracking-wide text-muted",
        day: "p-0 text-center",
        day_button:
          "mx-auto h-9 w-9 rounded-md text-sm font-medium text-ink transition hover:bg-panel",
        selected: "bg-brand text-white hover:bg-brand/90",
        today: "bg-brand/15 text-brand",
        outside: "text-muted opacity-40",
        disabled: "text-muted opacity-30",
        hidden: "invisible",
        ...classNames
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
