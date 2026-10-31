import { HospitalProfile } from '../types';

export const LOTUS_FACILITY_IMAGE = '/assets/aistudio/file_00000000200482118613bf59a05df0cd_d3602e18.png';

export const DEFAULT_HOSPITAL_PROFILE: HospitalProfile = {
  id: 'hosp_lotus_jammikunta',
  name: 'LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA',
  expanded_name: 'Lotus Diagnostic Centre & Skin Clinic | Jammikunta, Karimnagar District, Telangana',
  country: 'India',
  state: 'Telangana',
  city_district: 'Jammikunta, Karimnagar District',
  currency: 'INR',
  currency_symbol: '₹',
  timezone: 'Asia/Kolkata',
  date_format: 'DD-MM-YYYY',
  time_format: 'IST',
  contact_phone: '+91 8727 255 678',
  emergency_helpline: '108 / 102 (Casualty: +91 8727 255 108)',
  updated_at: new Date().toISOString(),
};

/**
 * Format a numeric amount in Indian Rupees (INR)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date string to Indian Standard DD-MM-YYYY
 */
export function formatIndianDate(isoOrDateStr: string | Date | undefined | null): string {
  if (!isoOrDateStr) return '—';
  try {
    const d = typeof isoOrDateStr === 'string' ? new Date(isoOrDateStr) : isoOrDateStr;
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '—';
  }
}

/**
 * Format timestamp into Indian Standard Time (IST) representation
 */
export function formatISTTime(isoOrDateStr: string | Date | undefined | null, includeSeconds = false): string {
  if (!isoOrDateStr) return '—';
  try {
    const d = typeof isoOrDateStr === 'string' ? new Date(isoOrDateStr) : isoOrDateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true,
    }) + ' IST';
  } catch {
    return '—';
  }
}

/**
 * Format full date and time in IST format (DD-MM-YYYY, hh:mm A IST)
 */
export function formatIndianDateTime(isoOrDateStr: string | Date | undefined | null): string {
  if (!isoOrDateStr) return '—';
  return `${formatIndianDate(isoOrDateStr)} at ${formatISTTime(isoOrDateStr)}`;
}
