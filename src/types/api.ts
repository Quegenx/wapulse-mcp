export interface SearchRequest {
  dateFrom: string;
  dateTo: string;
  hotelName?: string;
  city: string;
  paxChildren: number[];
  adults: number;
  stars?: number;
}

export interface Price {
  amount: number;
  currency: string;
}

export interface Provider {
  id: number;
  name: string;
}

export interface SpecialOffer {
  type: number;
  title: string;
  description: string;
}

export interface RoomPax {
  adults: number;
  children: number[];
}

export interface RoomQuantity {
  min: number;
  max: number;
}

export interface RoomItem {
  name: string;
  category: string;
  bedding: string;
  board: string;
  hotelId: string;
  pax: RoomPax;
  quantity: RoomQuantity;
  detailsAvailable: boolean;
}

export interface CancellationFrame {
  from: string;
  to: string;
  penalty: Price;
}

export interface Cancellation {
  type: string;
  frames: CancellationFrame[];
}

export interface SearchResult {
  price: Price;
  netPrice: Price;
  barRate: Price | null;
  confirmation: string;
  paymentType: string;
  packageRate: boolean;
  commissionable: boolean;
  providers: Provider[];
  specialOffers: SpecialOffer[];
  items: RoomItem[];
  cancellation: Cancellation;
  code: string;
  dates: any | null;
  source: number;
  offer: any | null;
}

export interface GetRoomsActiveRequest {
  StartDate?: string;
  EndDate?: string;
  HotelName?: string;
  HotelStars?: number;
  City?: string;
  RoomBoard?: string;
  RoomCategory?: string;
  Provider?: string;
}

export interface RoomActiveResult {
  StartDate: string;
  EndDate: string;
  HotelName: string;
  City: string;
  Price: number;
  RoomBoard: string;
  RoomCategory: string;
  PriceUpdatedAt: string;
  PrebookId: number;
  PushPrice: number;
  ReservationFullName: string;
  LastPrice: number;
  DateLastPrice: string;
}

export interface GetRoomsActiveResponse {
  TotalCount: number;
  Pages: number;
  Results: RoomActiveResult[];
}

export interface GetRoomsCancelRequest {
  StartDate?: string;
  EndDate?: string;
  HotelName?: string;
  HotelStars?: number;
  City?: string;
  RoomBoard?: string;
  RoomCategory?: string;
  Provider?: string;
}

export interface RoomCancelResult {
  startDate: string;
  endDate: string;
  hotelName: string;
  price: number;
  pushPrice: number;
  board: string;
  category: string;
  reservationFullName: string;
  cancellationTo: string;
}

export type GetRoomsCancelResponse = RoomCancelResult[];

export interface GetOpportunitiesRequest {
  StartDate?: string;
  EndDate?: string;
  HotelName?: string;
  HotelStars?: number;
  City?: string;
  RoomBoard?: string;
  RoomCategory?: string;
  Provider?: string;
}

export interface OpportunityResult {
  PrebookId: number;
  StartDate: string;
  EndDate: string;
  HotelName: string;
  Price: number;
  PushPrice: number;
  Board: string;
  Category: string;
  ReservationFullName: string;
  LastPrice: number;
  DateLastPrice: string;
}

export type GetOpportunitiesResponse = OpportunityResult[];

export interface InsertOpportunityRequest {
  boardId: number;
  categoryId: number;
  startDateStr: string;
  endDateStr: string;
  buyPrice: number;
  pushPrice: number;
  maxRooms: number;
  ratePlanCode?: string;
  invTypeCode?: string;
  reservationFullName: string;
  destinationId: number;
  stars: number;
  locationRange?: number;
  providerId?: number | null;
  paxAdults: number;
  paxChildren: number[];
}

export interface InsertOpportunityResponse {
  success: boolean;
  message: string;
  id: number;
}

export enum BoardType {
  RoomOnly = 1,
  Breakfast = 2,
  HalfBoard = 3,
  FullBoard = 4,
  AllInclusive = 5,
  ContinentalBreakfast = 6,
  BedAndDinner = 7
}

export enum RoomCategory {
  Standard = 1,
  Superior = 2,
  Dormitory = 3,
  Deluxe = 4,
  Largeroom = 5,
  Lowsuite = 6,
  Apartment = 7,
  Highsuite = 8,
  Luxury = 9,
  Premium = 10,
  JuniorSuite = 11,
  Suite = 12,
  MiniSuite = 13,
  Studio = 14,
  Executive = 15
}

export interface CreateManualOpportunityRequest {
  StartDate: string;
  EndDate: string;
  PaxAdults: number;
  PaxChildren: number[];
  ReservationFirstName: string;
  ReservationLastName: string;
  City: string;
  RoomCategory: string;
  RoomBoard: string;
  ExpectedPrice: number;
}

export interface CreateManualOpportunityResponse {
  success: boolean;
  message: string;
  hotelId: number;
  provider: string;
  board: string;
  roomName: string;
  bookingSuccess: number;
  bookingConfirmed: boolean;
}

export interface OperationResult {
  name: string;
  result: string;
}

export type CancelRoomActiveResponse = OperationResult[];

export interface RoomArchiveRequest {
  StayFrom?: string;
  StayTo?: string;
  HotelName?: string;
  MinPrice?: number;
  MaxPrice?: number;
  City?: string;
  RoomBoard?: string;
  RoomCategory?: string;
  MinUpdatedAt?: string;
  MaxUpdatedAt?: string;
  PageNumber?: number;
  PageSize?: number;
}

export interface RoomArchiveResult {
  StartDate: string;
  EndDate: string;
  HotelName: string;
  City: string;
  Price: number;
  RoomBoard: string;
  RoomCategory: string;
  PriceUpdatedAt: string;
}

export interface RoomArchiveResponse {
  TotalCount: number;
  Pages: number;
  Results: RoomArchiveResult[];
}

// Static Hotel Data Types
export interface HotelImage {
  id: number;
  width: number;
  height: number;
  title: string;
  url: string;
}

export interface HotelDestination {
  destinationId: number;
  type: string;
}

export interface HotelFacilities {
  tags: string[];
  list: string[];
}

export interface StaticHotelData {
  id: number;
  name: string;
  address: string;
  status: number;
  zip: string;
  phone: string;
  fax?: string;
  lat: number;
  lon: number;
  seoname: string;
  stars: number;
  preferred: number;
  top: number;
  description: string;
  mainImageId: number;
  destinations: HotelDestination[];
  surroundings: HotelDestination[];
  facilities: HotelFacilities;
  images: HotelImage[];
}
