import { FastMCP } from "fastmcp";
import { z } from "zod";
import fetch from "node-fetch";
import { BoardType, RoomCategory } from "./types/api.js";
import type { 
  SearchRequest, 
  SearchResult, 
  GetRoomsActiveRequest, 
  GetRoomsActiveResponse,
  GetRoomsCancelRequest,
  GetRoomsCancelResponse,
  GetOpportunitiesRequest,
  GetOpportunitiesResponse,
  InsertOpportunityRequest,
  InsertOpportunityResponse,
  CreateManualOpportunityRequest,
  CreateManualOpportunityResponse,
  CancelRoomActiveResponse,
  RoomArchiveRequest,
  RoomArchiveResponse,
  StaticHotelData
} from "./types/api.js";

// Validate date format YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const server = new FastMCP({
  name: "Medici Hotels MCP",
  version: "1.0.0",
});

// Add the search tool
server.addTool({
  name: "search_hotels_prices_by_dates",
  description: "Search for hotel prices using filters like city, dates, star rating, and guest configuration",
  parameters: z.object({
    dateFrom: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
    dateTo: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
    hotelName: z.string().optional(),
    city: z.string(),
    adults: z.number().int().min(1).default(2),
    paxChildren: z.array(z.number().int().min(0).max(17)).default([]),
    stars: z.number().int().min(1).max(5).optional(),
  }),
  execute: async (args, { log }) => {
    try {
      // TODO: Replace with actual token management
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: SearchRequest = {
        dateFrom: args.dateFrom,
        dateTo: args.dateTo,
        city: args.city,
        adults: args.adults,
        paxChildren: args.paxChildren,
        ...(args.hotelName && { hotelName: args.hotelName }),
        ...(args.stars && { stars: args.stars }),
      };

      // Log a simplified version of the request
      log.info("Searching for hotels", {
        city: requestBody.city,
        dates: `${requestBody.dateFrom} to ${requestBody.dateTo}`,
        adults: requestBody.adults,
        children: requestBody.paxChildren.length,
        stars: requestBody.stars,
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/GetInnstantSearchPrice",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const results = (await response.json()) as SearchResult[];

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} hotel options:\n\n${results
              .map(
                (r) => `- ${r.items[0].name} (${r.items[0].hotelId})
  • Price: ${r.price.amount} ${r.price.currency}
  • Board: ${r.items[0].board}
  • Room Type: ${r.items[0].category} ${r.items[0].bedding}
  • Cancellation: ${r.cancellation.type}
  ${r.specialOffers.length ? `• Special Offers: ${r.specialOffers.map(o => o.title).join(", ")}\n` : ""}`
              )
              .join("\n")}`
          }
        ]
      };
    } catch (error) {
      log.error("Search failed", { error: String(error) });
      throw error;
    }
  }
});

// Add the get active rooms tool
server.addTool({
  name: "get_my_hotels_orders",
  description: "Retrieve all currently active (unsold) room opportunities with optional filters",
  parameters: z.object({
    StartDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    EndDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    HotelName: z.string().optional(),
    HotelStars: z.number().int().min(1).max(5).optional(),
    City: z.string().optional(),
    RoomBoard: z.string().optional(),
    RoomCategory: z.string().optional(),
    Provider: z.string().optional(),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: GetRoomsActiveRequest = {
        ...args
      };

      log.info("Fetching active rooms", {
        dates: args.StartDate && args.EndDate ? `${args.StartDate} to ${args.EndDate}` : "all dates",
        city: args.City || "any",
        hotel: args.HotelName || "any",
        stars: args.HotelStars || "any",
        board: args.RoomBoard || "any",
        category: args.RoomCategory || "any",
        provider: args.Provider || "any"
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/GetRoomsActive",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GetRoomsActiveResponse;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `Found ${data.TotalCount} active rooms (${data.Pages} pages):\n\n${data.Results
              .map(
                (r) => `- ${r.HotelName} (${r.City})
  • Dates: ${new Date(r.StartDate).toLocaleDateString()} to ${new Date(r.EndDate).toLocaleDateString()}
  • Price: ${r.Price} (Push: ${r.PushPrice}, Last: ${r.LastPrice})
  • Room: ${r.RoomCategory} with ${r.RoomBoard} board
  • Prebook ID: ${r.PrebookId}
  • Reserved for: ${r.ReservationFullName}
  • Last price update: ${new Date(r.PriceUpdatedAt).toLocaleString()}`
              )
              .join("\n\n")}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to fetch active rooms", { error: String(error) });
      throw error;
    }
  }
});

// Add the get canceled rooms tool
server.addTool({
  name: "get_hotels_rooms_canceled",
  description: "Returns a list of room bookings that were canceled, with optional filters for dates, hotel, city, etc.",
  parameters: z.object({
    StartDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    EndDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    HotelName: z.string().optional(),
    HotelStars: z.number().int().min(1).max(5).optional(),
    City: z.string().optional(),
    RoomBoard: z.string().optional(),
    RoomCategory: z.string().optional(),
    Provider: z.string().optional(),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: GetRoomsCancelRequest = {
        ...args
      };

      log.info("Fetching canceled rooms", {
        dates: args.StartDate && args.EndDate ? `${args.StartDate} to ${args.EndDate}` : "all dates",
        city: args.City || "any",
        hotel: args.HotelName || "any",
        stars: args.HotelStars || "any",
        board: args.RoomBoard || "any",
        category: args.RoomCategory || "any",
        provider: args.Provider || "any"
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/GetRoomsCancel",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const results = (await response.json()) as GetRoomsCancelResponse;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} canceled room bookings:\n\n${results
              .map(
                (r) => `- ${r.hotelName}
  • Dates: ${new Date(r.startDate).toLocaleDateString()} to ${new Date(r.endDate).toLocaleDateString()}
  • Room: ${r.category} with ${r.board}
  • Price: ${r.price} (Push Price: ${r.pushPrice})
  • Reserved for: ${r.reservationFullName}
  • Free cancellation until: ${new Date(r.cancellationTo).toLocaleString()}`
              )
              .join("\n\n")}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to fetch canceled rooms", { error: String(error) });
      throw error;
    }
  }
});

// Add the opportunities tool
server.addTool({
  name: "get_hotels_opportunities_options",
  description: "Returns a list of active room opportunities based on hotel, date, and other filters",
  parameters: z.object({
    StartDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    EndDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    HotelName: z.string().optional(),
    HotelStars: z.number().int().min(1).max(5).optional(),
    City: z.string().optional(),
    RoomBoard: z.string().optional(),
    RoomCategory: z.string().optional(),
    Provider: z.string().optional(),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: GetOpportunitiesRequest = {
        ...args
      };

      log.info("Fetching opportunities", {
        dates: args.StartDate && args.EndDate ? `${args.StartDate} to ${args.EndDate}` : "all dates",
        city: args.City || "any",
        hotel: args.HotelName || "any",
        stars: args.HotelStars || "any",
        board: args.RoomBoard || "any",
        category: args.RoomCategory || "any",
        provider: args.Provider || "any"
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/GetOpportunities",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const opportunities = (await response.json()) as GetOpportunitiesResponse;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `Found ${opportunities.length} opportunities:\n\n${opportunities
              .map(
                (opp) => `- ${opp.HotelName}
  • Prebook ID: ${opp.PrebookId}
  • Dates: ${new Date(opp.StartDate).toLocaleDateString()} to ${new Date(opp.EndDate).toLocaleDateString()}
  • Room: ${opp.Category} with ${opp.Board}
  • Price: ${opp.Price.toFixed(2)} (Push: ${opp.PushPrice.toFixed(2)})
  • Last Price: ${opp.LastPrice.toFixed(2)} (Updated: ${new Date(opp.DateLastPrice).toLocaleString()})
  • Reserved for: ${opp.ReservationFullName}`
              )
              .join("\n\n")}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to fetch opportunities", { error: String(error) });
      throw error;
    }
  }
});

// Add the insert opportunity tool
server.addTool({
  name: "insert_hotels_opportunities_options",
  description: "Insert a new hotel opportunity into the system",
  parameters: z.object({
    boardId: z.number().int().min(1).max(7),
    categoryId: z.number().int().min(1).max(15),
    startDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Date must be in ISO8601 format"),
    endDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "Date must be in ISO8601 format"),
    buyPrice: z.number().positive(),
    pushPrice: z.number().positive(),
    maxRooms: z.number().int().positive(),
    ratePlanCode: z.string().optional(),
    invTypeCode: z.string().optional(),
    reservationFullName: z.string(),
    destinationId: z.number().int().positive(),
    stars: z.number().int().min(1).max(5),
    locationRange: z.number().int().min(0).optional(),
    providerId: z.number().int().positive().nullable().optional(),
    paxAdults: z.number().int().positive(),
    paxChildren: z.array(z.number().int().min(0).max(17)).default([]),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: InsertOpportunityRequest = {
        ...args
      };

      // Get board type and room category names for logging
      const boardName = BoardType[args.boardId] || 'Unknown';
      const categoryName = RoomCategory[args.categoryId] || 'Unknown';

      log.info("Inserting new opportunity", {
        dates: `${new Date(args.startDateStr).toLocaleDateString()} to ${new Date(args.endDateStr).toLocaleDateString()}`,
        board: boardName,
        category: categoryName,
        prices: `Buy: ${args.buyPrice}, Push: ${args.pushPrice}`,
        maxRooms: args.maxRooms,
        stars: args.stars,
        pax: `${args.paxAdults} adults, ${args.paxChildren.length} children`
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/InsertOpportunity",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as InsertOpportunityResponse;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `✅ Opportunity inserted successfully!

Details:
• ID: ${result.id}
• Board: ${boardName} (ID: ${args.boardId})
• Room Category: ${categoryName} (ID: ${args.categoryId})
• Dates: ${new Date(args.startDateStr).toLocaleDateString()} to ${new Date(args.endDateStr).toLocaleDateString()}
• Prices: Buy ${args.buyPrice}, Push ${args.pushPrice}
• Rooms Available: ${args.maxRooms}
• Stars: ${args.stars}
• Guest Configuration: ${args.paxAdults} adults${args.paxChildren.length ? `, ${args.paxChildren.length} children (ages: ${args.paxChildren.join(', ')})` : ''}
• Reserved for: ${args.reservationFullName}

Server Response: ${result.message}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to insert opportunity", { error: String(error) });
      throw error;
    }
  }
});

// Add the create manual opportunity tool
server.addTool({
  name: "book_now_hotel",
  description: "Create a manual hotel room opportunity and trigger the booking flow for it",
  parameters: z.object({
    StartDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
    EndDate: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
    PaxAdults: z.number().int().positive(),
    PaxChildren: z.array(z.number().int().min(0).max(17)).default([]),
    ReservationFirstName: z.string(),
    ReservationLastName: z.string(),
    City: z.string(),
    RoomCategory: z.string(),
    RoomBoard: z.string(),
    ExpectedPrice: z.number().positive(),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: CreateManualOpportunityRequest = {
        ...args
      };

      log.info("Creating manual opportunity", {
        dates: `${args.StartDate} to ${args.EndDate}`,
        city: args.City,
        room: `${args.RoomCategory} with ${args.RoomBoard}`,
        price: args.ExpectedPrice,
        pax: `${args.PaxAdults} adults, ${args.PaxChildren.length} children`,
        guest: `${args.ReservationFirstName} ${args.ReservationLastName}`
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/CreateManualOpportunity",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as CreateManualOpportunityResponse;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `${result.success ? '✅' : '❌'} Manual Opportunity Creation ${result.success ? 'Successful' : 'Failed'}!

Details:
• Hotel ID: ${result.hotelId}
• Room: ${result.roomName}
• Board: ${result.board}
• Provider: ${result.provider}
• Booking ID: ${result.bookingSuccess}
• Booking Status: ${result.bookingConfirmed ? 'Confirmed' : 'Pending'}

Server Message: ${result.message}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to create manual opportunity", { error: String(error) });
      throw error;
    }
  }
});

// Add the cancel room tool
server.addTool({
  name: "cancel_room",
  description: "Cancels an existing prebooked room by its ID",
  parameters: z.object({
    prebookId: z.number().int().positive(),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      log.info("Canceling room booking", {
        prebookId: args.prebookId
      });

      const response = await fetch(
        `https://medici-backend.azurewebsites.net/api/hotels/CancelRoomActive?prebookId=${args.prebookId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const operations = (await response.json()) as CancelRoomActiveResponse;

      // Count successes and failures
      const successes = operations.filter(op => op.result === "Success").length;
      const failures = operations.length - successes;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: `Cancellation Process Complete (${successes} succeeded, ${failures} failed)

Operation Results:
${operations.map(op => `• ${op.name}: ${op.result === "Success" ? "✅" : "❌"} ${op.result}`).join('\n')}

${failures === 0 ? "✅ All operations completed successfully!" : "⚠️ Some operations failed, please check the results above."}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to cancel room", { error: String(error) });
      throw error;
    }
  }
});

// Add the get room archive data tool
interface RoomArchiveDataResult {
  startDate: string;
  endDate: string;
  hotelName: string;
  city: string;
  price: number;
  roomBoard: string;
  roomCategory: string;
  priceUpdatedAt: string;
}

interface RoomArchiveDataResponse {
  totalCount: number;
  pages: number;
  results: RoomArchiveDataResult[];
}

server.addTool({
  name: "get_hotels_prices_history",
  description: "Retrieves archived room data recorded in the system with optional filters and pagination",
  parameters: z.object({
    StayFrom: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    StayTo: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    HotelName: z.string().optional(),
    MinPrice: z.number().int().positive().optional(),
    MaxPrice: z.number().int().positive().optional(),
    City: z.string().optional(),
    RoomBoard: z.string().optional(),
    RoomCategory: z.string().optional(),
    MinUpdatedAt: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    MaxUpdatedAt: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format").optional(),
    PageNumber: z.number().int().positive().default(1),
    PageSize: z.number().int().positive().default(10000),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const requestBody: RoomArchiveRequest = {
        ...args
      };

      log.info("Fetching room archive data", {
        stay: args.StayFrom && args.StayTo ? `${args.StayFrom} to ${args.StayTo}` : "all dates",
        priceRange: args.MinPrice && args.MaxPrice ? `${args.MinPrice} to ${args.MaxPrice}` : "any price",
        hotel: args.HotelName || "any",
        city: args.City || "any",
        board: args.RoomBoard || "any",
        category: args.RoomCategory || "any",
        updatedAt: args.MinUpdatedAt && args.MaxUpdatedAt ? `${args.MinUpdatedAt} to ${args.MaxUpdatedAt}` : "any time",
        page: `${args.PageNumber} (size: ${args.PageSize})`
      });

      const response = await fetch(
        "https://medici-backend.azurewebsites.net/api/hotels/GetRoomArchiveData",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as RoomArchiveDataResponse;

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: data.totalCount === 0 
              ? "No archived room prices found for the specified criteria."
              : `Found ${data.totalCount} archived room prices (${data.pages} pages):\n\n${data.results.map(room => `
- ${room.hotelName} (${room.city})
  • Dates: ${new Date(room.startDate).toLocaleDateString()} to ${new Date(room.endDate).toLocaleDateString()}
  • Room: ${room.roomCategory} with ${room.roomBoard}
  • Price: ${room.price.toFixed(2)}
  • Last Updated: ${new Date(room.priceUpdatedAt).toLocaleString()}`).join('\n')}
${args.PageNumber < data.pages ? `\nℹ️ There are more results available. Use PageNumber ${args.PageNumber + 1} to see the next page.` : ''}`
          }
        ]
      };
    } catch (error) {
      log.error("Failed to fetch room archive data", { error: String(error) });
      throw error;
    }
  }
});

// Add the static hotel data tool
server.addTool({
  name: "get_hotels_by_ids",
  description: "Get detailed hotel information by hotel IDs",
  parameters: z.object({
    hotelIds: z.array(z.number()).min(1).max(500).describe("List of hotel IDs to fetch, max 500 IDs"),
  }),
  execute: async (args, { log }) => {
    try {
      const token = process.env.MEDICI_API_TOKEN;
      if (!token) {
        throw new Error("API token not configured");
      }

      const hotelIds = args.hotelIds.join(",");
      log.info("Fetching hotel data", { hotelIds });

      const response = await fetch(
        `https://static-data.innstant-servers.com/hotels/${hotelIds}`,
        {
          method: "GET",
          headers: {
            "aether-application-key": token,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as StaticHotelData[];

      // Format the results for better readability
      return {
        content: [
          {
            type: "text",
            text: data.map(hotel => `
Hotel: ${hotel.name} (${hotel.stars}★)
ID: ${hotel.id}
Address: ${hotel.address}, ${hotel.zip}
Phone: ${hotel.phone}${hotel.fax ? `\nFax: ${hotel.fax}` : ''}
Location: ${hotel.lat}, ${hotel.lon}
Status: ${hotel.status === 1 ? 'Active' : 'Inactive'}

Description:
${hotel.description}

Facilities:
${hotel.facilities.list.join(", ")}

Images: ${hotel.images.length} available
Main Image ID: ${hotel.mainImageId}

Destinations: ${hotel.destinations.map(d => `${d.type}: ${d.destinationId}`).join(", ")}
`).join("\n\n---\n\n")
          }
        ]
      };
    } catch (error) {
      log.error("Failed to fetch hotel data", { error: String(error) });
      throw error;
    }
  }
});

// Start the server
server.start({
  transportType: "stdio"
});

console.log("Medici Hotels MCP server started");
