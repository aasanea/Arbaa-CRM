import React from 'react';

interface FormattedDateProps {
  date: string | Date | number;
  showTime?: boolean;
  timeOnly?: boolean;
  noTooltip?: boolean;
  className?: string;
}

export const formatGregorian = (dateInput: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'تاريخ غير صالح';
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', options).format(d);
  } catch (e) {
    return 'تاريخ غير صالح';
  }
};

export const formatHijri = (dateInput: string | Date | number): string => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'تاريخ غير صالح';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch (e) {
    return '';
  }
};

export const FormattedDate: React.FC<FormattedDateProps> = ({
  date,
  showTime = false,
  timeOnly = false,
  noTooltip = false,
  className = '',
}) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  let displayString = '';
  if (timeOnly) {
    displayString = formatGregorian(d, { hour: '2-digit', minute: '2-digit' });
  } else if (showTime) {
    displayString = formatGregorian(d, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } else {
    displayString = formatGregorian(d, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (noTooltip) {
    return <span className={className}>{displayString}</span>;
  }

  const hijriString = formatHijri(d);

  return (
    <span
      className={`cursor-help border-b border-dashed border-luxury-dark-400/40 hover:border-luxury-gold-500/50 transition-colors ${className}`}
      title={`التاريخ الهجري: ${hijriString}`}
    >
      {displayString}
    </span>
  );
};
