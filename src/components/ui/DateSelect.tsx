import React, { useState, useId } from "react";
import { DayPicker } from "react-day-picker";

interface Props {
  children: React.ReactNode;
  className?: string;
  value?: Date | undefined;
  onChange?: (date: Date | undefined) => void;
}

// Augment CSSProperties with anchor-related properties used by DaisyUI
declare global {
  namespace React {
    interface CSSProperties {
      anchorName?: string;
      positionAnchor?: string;
    }
  }
}

const DateSelect: React.FC<Props> = ({ className, children, value, onChange, ...props }) => {
  const baseClasses = "input input-border font-inria text-[1.2rem] text-center";

  // Use controlled value if provided, otherwise use internal state
  const [internalDate, setInternalDate] = useState<Date | undefined>();
  const date = value !== undefined ? value : internalDate;
  
  const handleDateChange = (newDate: Date | undefined) => {
    if (onChange) {
      onChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  };

  // generate a unique id so multiple DateSelects don't share the same popover
  const id = useId();
  const sanitized = id.replace(/[:]/g, '');
  const popoverId = `rdp-popover-${sanitized}`;

  return (
    <>
      <button 
        // @ts-expect-error custom attribute for DaisyUI popover target
        popovertarget={popoverId}
        className={`${baseClasses} ${className ?? ''}`} 
        style={{ anchorName: `--${popoverId}` } as React.CSSProperties}
        {...props}
      >
        {date ? date.toLocaleDateString() : children}
      </button>
      <div 
        popover="auto" 
        id={popoverId} 
        className="dropdown" 
        style={{ positionAnchor: `--${popoverId}` } as React.CSSProperties}
      >
        <DayPicker className="react-day-picker" mode="single" selected={date} onSelect={handleDateChange} />
      </div>
    </>
  );
}

DateSelect.displayName = 'DateSelect';

export default DateSelect;