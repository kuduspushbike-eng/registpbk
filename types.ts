export enum UserStatus {
  NEW = "NEW",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  WAITING_APPROVAL = "WAITING_APPROVAL",
  APPROVED = "APPROVED",
  REGISTERED = "REGISTERED",
}

export enum ShirtSize {
  XS = "XS",
  S = "S",
  M = "M",
  L = "L",
  XL = "XL",
}

export type PaymentMethod = "TRANSFER" | "CASH";

export interface MemberData {
  whatsapp: string;
  status: UserStatus;
  paymentAmount: number; // 200000/300000 + random digits
  paymentCode: number; // The random digits
  paymentMethod?: PaymentMethod;
  childCount: number; // 1 or 2

  // Child 1
  fullName?: string;
  nickname?: string;
  gender?: "BOY" | "GIRL";
  birthYear?: number;
  birthDate?: string;
  shirtSize?: ShirtSize;

  // Child 2 (Optional)
  fullName2?: string;
  nickname2?: string;
  gender2?: "BOY" | "GIRL";
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

export enum RaceCategory {
  MIX_2024 = "MIX 2024",
  GIRLS_2023 = "GIRLS 2023",
  BOYS_2023 = "BOYS 2023",
  GIRLS_2022 = "GIRLS 2022",
  BOYS_2022 = "BOYS 2022",
  GIRLS_2021 = "GIRLS 2021",
  BOYS_2021 = "BOYS 2021",
  GIRLS_2020 = "GIRLS 2020",
  BOYS_2020 = "BOYS 2020",
  GIRLS_2019 = "GIRLS 2019",
  BOYS_2019 = "BOYS 2019",
  TOP_CLASS_MAX_2017_MIX = "TOP CLASS MAX 2017 MIX",
}

export enum RaceShirtSize {
  XS = "XS (L:27 P:40)",
  S = "S (L:29 P:42)",
  M = "M (L:31 P:44)",
  L = "L (L:33 P:46)",
  XL = "XL (L:35 P:48)",
  XXL = "2XL (L:37 P:50)",
}

export interface RaceKolektifData {
  category: RaceCategory;
  riderName: string;
  teamName: string;
  community: string;
  shirtSize: RaceShirtSize;
  startNumber: string;
  bornDate: string; // YYYY-MM-DD
  kkAktaFile?: string; // base64
  buktiTransferFile?: string; // base64
}
