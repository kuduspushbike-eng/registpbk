export enum UserStatus {
  NEW = 'NEW',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REGISTERED = 'REGISTERED'
}

export enum ShirtSize {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL'
}

export type PaymentMethod = 'TRANSFER' | 'CASH';

export interface MemberData {
  whatsapp: string;
  status: UserStatus;
  paymentAmount: number; // 200000/300000 + random digits
  paymentCode: number;   // The random digits
  paymentMethod?: PaymentMethod;
  childCount: number; // 1 or 2
  
  // Child 1
  fullName?: string;
  nickname?: string;
  gender?: 'BOY' | 'GIRL';
  birthYear?: number;
  birthDate?: string;
  shirtSize?: ShirtSize;

  // Child 2 (Optional)
  fullName2?: string;
  nickname2?: string;
  gender2?: 'BOY' | 'GIRL';
  birthYear2?: number;
  birthDate2?: string;
  shirtSize2?: ShirtSize;

  // Parents (Shared)
  fatherName?: string;
  motherName?: string;
  addressKK?: string;
  addressDomicile?: string;
}

export const BIRTH_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];