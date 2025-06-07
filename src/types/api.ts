export interface SearchRequest {
  dateFrom: string;
  dateTo: string;
  hotelName?: string;
  city: string;
  paxChildren: number[];
  adults: number;
  stars?: number;
  limit?: number;
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

export interface SearchResultItem {
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

export type SearchResult = SearchResultItem[];

export interface GetRoomsActiveRequest {
  startDate?: string;
  endDate?: string;
  hotelName?: string;
  hotelStars?: number;
  city?: string;
  roomBoard?: string;
  roomCategory?: string;
  provider?: string;
}

export interface RoomActiveResult {
  prebookId: number;
  startDate: string;
  endDate: string;
  hotelName: string;
  city?: string;
  price: number;
  pushPrice: number;
  board: string;
  category: string;
  reservationFullName: string;
  lastPrice: number;
  dateLastPrice: string;
}

export type GetRoomsActiveResponse = RoomActiveResult[];

export interface GetRoomsCancelRequest {
  startDate?: string;
  endDate?: string;
  hotelName?: string;
  hotelStars?: number;
  city?: string;
  roomBoard?: string;
  roomCategory?: string;
  provider?: string;
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
  dateLastPrice: string;
}

export type GetRoomsCancelResponse = RoomCancelResult[];

export interface GetOpportunitiesRequest {
  hotelStars?: number;
  city?: string;
  hotelName?: string;
  reservationMonthDate?: string;
  checkInMonthDate?: string;
  provider?: string;
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
  hotelId?: number;
  startDateStr: string;
  endDateStr: string;
  boardId: number;
  categoryId: number;
  buyPrice: number;
  pushPrice: number;
  maxRooms: number;
  ratePlanCode?: string;
  invTypeCode?: string;
  reservationFullName?: string;
  stars?: number;
  destinationId?: number;
  locationRange?: number;
  providerId?: number | null;
  userId?: number;
  paxAdults?: number;
  paxChildren: number[];
}

export interface InsertOpportunityResponse {
  success: boolean;
  message: string;
  id: number;
}

export interface DashboardApiParams {
  hotelStars?: number;
  city?: string;
  hotelName?: string;
  reservationMonthDate?: string;
  checkInMonthDate?: string;
  provider?: string;
}

export interface DashboardResponse {
  [key: string]: any;
}

export interface ApiBooking {
  preBookId: number;
  pushPrice: number;
}

export interface UpdatePushPriceResponse {
  [key: string]: any;
}

export interface ManualBookingRequest {
  hotelId?: number;
  from?: string;
  to?: string;
  guestName?: string;
  room?: any;
  searchResult?: any;
}

export interface ManualBookingResponse {
  [key: string]: any;
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

export interface OperationResult {
  name: string;
  result: string;
}

export type CancelRoomActiveResponse = OperationResult[];

export interface RoomArchiveRequest {
  stayFrom?: string;
  stayTo?: string;
  hotelName?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  roomBoard?: string;
  roomCategory?: string;
  minUpdatedAt?: string;
  maxUpdatedAt?: string;
  pageNumber: number;
  pageSize: number;
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
