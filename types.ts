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
  XL = 'XL',
  XXL = 'XXL'
}

export type PaymentMethod = 'TRANSFER' | 'CASH';

export interface MemberData {
  whatsapp: string;
  status: UserStatus;
  paymentAmount: number; // 200000 + random digits (if transfer)
  paymentCode: number;   // The random digits
  paymentMethod?: PaymentMethod; // Track selected method
  fullName?: string;
  nickname?: string;
  birthYear?: number;
  birthDate?: string;
  fatherName?: string;
  motherName?: string;
  addressKK?: string;
  addressDomicile?: string;
  shirtSize?: ShirtSize;
}

export const BIRTH_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];