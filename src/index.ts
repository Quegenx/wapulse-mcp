import { FastMCP, UserError } from "fastmcp";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
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
  ManualBookingRequest,
  ManualBookingResponse,
  CancelRoomActiveResponse,
  RoomArchiveRequest,
  RoomArchiveResponse,
  ApiBooking,
  UpdatePushPriceResponse
} from "./types/api.js";

// Optional: Define configuration schema for Smithery
export const configSchema = z.object({
  apiToken: z.string().describe("Medici API token for authentication")
});

// Validate date format YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  const server = new FastMCP({
    name: "Medici Hotels MCP",
    version: "1.0.0",
    instructions: "MCP server for searching and booking hotels through Medici API. Use tools to search hotel prices, manage active bookings, canceled bookings, sold bookings, add new opportunities and more. All tools require a valid API token.",
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
      limit: z.number().int().optional(),
    }),
    annotations: {
      title: "Hotel Price Search",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new UserError("API token not configured. Please set MEDICI_API_TOKEN environment variable.");
        }

        // Validate dates
        const fromDate = new Date(args.dateFrom);
        const toDate = new Date(args.dateTo);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (fromDate < today) {
          throw new UserError("Check-in date cannot be in the past");
        }

        if (fromDate >= toDate) {
          throw new UserError("Check-in date must be before check-out date");
        }

        if (!args.city.trim()) {
          throw new UserError("City is required for hotel search");
        }

        const requestBody: SearchRequest = {
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          city: args.city,
          adults: args.adults,
          paxChildren: args.paxChildren,
          ...(args.hotelName && { hotelName: args.hotelName }),
          ...(args.stars && { stars: args.stars }),
          ...(args.limit && { limit: args.limit }),
        };

        log.info("Starting hotel search", {
          city: requestBody.city,
          dates: `${requestBody.dateFrom} to ${requestBody.dateTo}`,
          adults: requestBody.adults,
          children: requestBody.paxChildren.length,
          stars: requestBody.stars,
          hotelName: requestBody.hotelName,
          limit: requestBody.limit,
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
          log.error("API request failed", { 
            status: response.status, 
            statusText: response.statusText,
            error: errorText 
          });
          throw new UserError(`Hotel search failed: ${response.status} - ${response.statusText}`);
        }

        const results = (await response.json()) as SearchResult;
        
        log.info("Hotel search completed", { 
          resultsCount: results.length,
          city: requestBody.city 
        });

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No hotels found for ${requestBody.city} from ${requestBody.dateFrom} to ${requestBody.dateTo}. Try adjusting your search criteria.`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} hotel options:\n\n${results.map((result, index) => 
                `${index + 1}. ${result.items[0]?.name || 'Unknown Hotel'}\n   Price: ${result.price.amount} ${result.price.currency}\n   Board: ${result.items[0]?.board || 'N/A'}\n   Category: ${result.items[0]?.category || 'N/A'}\n   Confirmation: ${result.confirmation}`
              ).join('\n\n')}`
            }
          ]
        };
      } catch (error) {
        if (error instanceof UserError) {
          throw error;
        }
        log.error("Unexpected error during hotel search", { 
          error: String(error),
          city: args.city,
          dates: `${args.dateFrom} to ${args.dateTo}`
        });
        throw new UserError("An unexpected error occurred while searching for hotels. Please try again.");
      }
    }
  });

  // Add the get active rooms tool
  server.addTool({
    name: "get_my_hotels_orders",
    description: "Retrieve all currently active (unsold) room opportunities with optional filters",
    parameters: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      hotelName: z.string().optional(),
      hotelStars: z.number().int().min(1).max(5).optional(),
      city: z.string().optional(),
      roomBoard: z.string().optional(),
      roomCategory: z.string().optional(),
      provider: z.string().optional(),
    }),
    annotations: {
      title: "Active Hotel Orders",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new UserError("API token not configured. Please set MEDICI_API_TOKEN environment variable.");
        }

        const requestBody: GetRoomsActiveRequest = {
          ...args
        };

        log.info("Fetching active hotel orders", {
          dates: args.startDate && args.endDate ? `${args.startDate} to ${args.endDate}` : "all dates",
          city: args.city || "any",
          hotel: args.hotelName || "any",
          stars: args.hotelStars || "any",
          board: args.roomBoard || "any",
          category: args.roomCategory || "any",
          provider: args.provider || "any"
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

        const results = (await response.json()) as GetRoomsActiveResponse;

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} active rooms:\n\n${results.map(room => 
                `- ${room.hotelName}\n  • Dates: ${new Date(room.startDate).toLocaleDateString()} to ${new Date(room.endDate).toLocaleDateString()}\n  • Price: ${room.price} (Push: ${room.pushPrice}, Last: ${room.lastPrice})\n  • Room: ${room.category} with ${room.board} board\n  • Prebook ID: ${room.prebookId}\n  • Reserved for: ${room.reservationFullName}\n  • Last price update: ${new Date(room.dateLastPrice).toLocaleDateString()}`
              ).join('\n\n')}`
            }
          ]
        };
      } catch (error) {
        log.error("Failed to fetch active rooms", { error: String(error) });
        throw error;
      }
    }
  });

  // Add the get rooms sales tool
  server.addTool({
    name: "get_hotels_rooms_sales",
    description: "Retrieve all sold room opportunities with optional filters",
    parameters: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      hotelName: z.string().optional(),
      hotelStars: z.number().int().min(1).max(5).optional(),
      city: z.string().optional(),
      roomBoard: z.string().optional(),
      roomCategory: z.string().optional(),
      provider: z.string().optional(),
    }),
    annotations: {
      title: "Sold Hotel Rooms",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody = {
          ...args
        };

        log.info("Fetching sold rooms", {
          dates: args.startDate && args.endDate ? `${args.startDate} to ${args.endDate}` : "all dates",
          city: args.city || "any",
          hotel: args.hotelName || "any",
          stars: args.hotelStars || "any",
          board: args.roomBoard || "any",
          category: args.roomCategory || "any",
          provider: args.provider || "any"
        });

        const response = await fetch(
          "https://medici-backend.azurewebsites.net/api/hotels/GetRoomsSales",
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

        const results = await response.json();

        return {
          content: [
            {
              type: "text",
              text: `Sold rooms data:\n\n${JSON.stringify(results, null, 2)}`
            }
          ]
        };
      } catch (error) {
        log.error("Failed to fetch sold rooms", { error: String(error) });
        throw error;
      }
    }
  });

  // Add the get canceled rooms tool
  server.addTool({
    name: "get_hotels_rooms_canceled",
    description: "Returns a list of room bookings that were canceled, with optional filters for dates, hotel, city, etc.",
    parameters: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      hotelName: z.string().optional(),
      hotelStars: z.number().int().min(1).max(5).optional(),
      city: z.string().optional(),
      roomBoard: z.string().optional(),
      roomCategory: z.string().optional(),
      provider: z.string().optional(),
    }),
    annotations: {
      title: "Canceled Hotel Rooms",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody: GetRoomsCancelRequest = {
          ...args
        };

        log.info("Fetching canceled rooms", {
          dates: args.startDate && args.endDate ? `${args.startDate} to ${args.endDate}` : "all dates",
          city: args.city || "any",
          hotel: args.hotelName || "any",
          stars: args.hotelStars || "any",
          board: args.roomBoard || "any",
          category: args.roomCategory || "any",
          provider: args.provider || "any"
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

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} canceled rooms:\n\n${results.map(room => 
                `- ${room.hotelName}\n  • Dates: ${new Date(room.startDate).toLocaleDateString()} to ${new Date(room.endDate).toLocaleDateString()}\n  • Price: ${room.price} (Push: ${room.pushPrice})\n  • Room: ${room.category} with ${room.board} board\n  • Reserved for: ${room.reservationFullName}\n  • Cancellation date: ${new Date(room.dateLastPrice).toLocaleDateString()}`
              ).join('\n\n')}`
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
      hotelStars: z.number().int().min(1).max(5).optional(),
      city: z.string().optional(),
      hotelName: z.string().optional(),
      reservationMonthDate: z.string().optional(),
      checkInMonthDate: z.string().optional(),
      provider: z.string().optional(),
    }),
    annotations: {
      title: "Hotel Opportunities",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody: GetOpportunitiesRequest = {
          ...args
        };

        log.info("Fetching opportunities", {
          city: args.city || "any",
          hotel: args.hotelName || "any",
          stars: args.hotelStars || "any",
          provider: args.provider || "any"
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

        return {
          content: [
            {
              type: "text",
              text: `Found ${opportunities.length} opportunities:\n\n${opportunities.map(opp => 
                `- ${opp.HotelName}\n  • Dates: ${new Date(opp.StartDate).toLocaleDateString()} to ${new Date(opp.EndDate).toLocaleDateString()}\n  • Price: ${opp.Price} (Push: ${opp.PushPrice})\n  • Room: ${opp.Category} with ${opp.Board} board\n  • Reserved for: ${opp.ReservationFullName}\n  • Last price: ${opp.LastPrice} (${new Date(opp.DateLastPrice).toLocaleDateString()})`
              ).join('\n\n')}`
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
      hotelId: z.number().int().optional(),
      boardId: z.number().int().min(1).max(2147483647),
      categoryId: z.number().int().min(1).max(2147483647),
      startDateStr: z.string().min(1).max(50),
      endDateStr: z.string().min(1).max(50),
      buyPrice: z.number().min(1).max(10000),
      pushPrice: z.number().min(1).max(10000),
      maxRooms: z.number().int().min(1).max(30),
      ratePlanCode: z.string().optional(),
      invTypeCode: z.string().optional(),
      reservationFullName: z.string().max(500).optional(),
      stars: z.number().int().min(1).max(5).optional(),
      destinationId: z.number().int().optional(),
      locationRange: z.number().int().min(0).optional(),
      providerId: z.number().int().optional().nullable(),
      userId: z.number().int().optional(),
      paxAdults: z.number().int().optional(),
      paxChildren: z.array(z.number().int().min(0).max(17)).default([]),
    }),
    annotations: {
      title: "Create Hotel Opportunity",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody: InsertOpportunityRequest = {
          ...args
        };

        log.info("Inserting new opportunity", {
          dates: `${args.startDateStr} to ${args.endDateStr}`,
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

        return {
          content: [
            {
              type: "text",
              text: `Opportunity inserted successfully:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        log.error("Failed to insert opportunity", { error: String(error) });
        throw error;
      }
    }
  });

  // Add the update push price tool
  server.addTool({
    name: "update_room_push_price",
    description: "Update the push price for an active room booking",
    parameters: z.object({
      preBookId: z.number().int(),
      pushPrice: z.number(),
    }),
    annotations: {
      title: "Update Room Push Price",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody: ApiBooking = {
          preBookId: args.preBookId,
          pushPrice: args.pushPrice
        };

        log.info("Updating push price", {
          preBookId: args.preBookId,
          newPushPrice: args.pushPrice
        });

        const response = await fetch(
          "https://medici-backend.azurewebsites.net/api/hotels/UpdateRoomsActivePushPrice",
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

        const result = await response.json() as UpdatePushPriceResponse;

        return {
          content: [
            {
              type: "text",
              text: `Push price updated successfully:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        log.error("Failed to update push price", { error: String(error) });
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
    annotations: {
      title: "Cancel Room Booking",
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
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

        const successes = operations.filter(op => op.result === "Success").length;
        const failures = operations.length - successes;

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

  // Add the manual book room tool
  server.addTool({
    name: "book_now_hotel",
    description: "Create a manual hotel room opportunity and trigger the booking flow for it",
    parameters: z.object({
      hotelId: z.number().int().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      guestName: z.string().optional(),
      room: z.any().optional(),
      searchResult: z.any().optional(),
    }),
    annotations: {
      title: "Book Hotel Now",
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody: ManualBookingRequest = {
          hotelId: args.hotelId,
          from: args.from,
          to: args.to,
          guestName: args.guestName,
          room: args.room,
          searchResult: args.searchResult
        };

        log.info("Creating manual booking", {
          hotelId: args.hotelId,
          dates: args.from && args.to ? `${args.from} to ${args.to}` : "not specified",
          guestName: args.guestName || "not specified"
        });

        const response = await fetch(
          "https://medici-backend.azurewebsites.net/api/hotels/ManualBookRoom",
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

        const result = await response.json() as ManualBookingResponse;

        return {
          content: [
            {
              type: "text",
              text: `Manual booking created:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        log.error("Failed to create manual booking", { error: String(error) });
        throw error;
      }
    }
  });

  server.addTool({
    name: "get_hotels_prices_history",
    description: "Retrieves archived room data recorded in the system with optional filters and pagination",
    parameters: z.object({
      stayFrom: z.string().optional(),
      stayTo: z.string().optional(),
      hotelName: z.string().optional(),
      minPrice: z.number().int().positive().optional(),
      maxPrice: z.number().int().positive().optional(),
      city: z.string().optional(),
      roomBoard: z.string().optional(),
      roomCategory: z.string().optional(),
      minUpdatedAt: z.string().optional(),
      maxUpdatedAt: z.string().optional(),
      pageNumber: z.number().int(),
      pageSize: z.number().int(),
    }),
    annotations: {
      title: "Hotel Price History",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
    execute: async (args, { log }) => {
      try {
        const token = config.apiToken;
        if (!token) {
          throw new Error("API token not configured");
        }

        const requestBody: RoomArchiveRequest = {
          ...args
        };

        log.info("Fetching room archive data", {
          stay: args.stayFrom && args.stayTo ? `${args.stayFrom} to ${args.stayTo}` : "all dates",
          priceRange: args.minPrice && args.maxPrice ? `${args.minPrice} to ${args.maxPrice}` : "any price",
          hotel: args.hotelName || "any",
          city: args.city || "any",
          board: args.roomBoard || "any",
          category: args.roomCategory || "any",
          updatedAt: args.minUpdatedAt && args.maxUpdatedAt ? `${args.minUpdatedAt} to ${args.maxUpdatedAt}` : "any time",
          page: `${args.pageNumber} (size: ${args.pageSize})`
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

        const data = await response.json() as RoomArchiveResponse;

        return {
          content: [
            {
              type: "text",
              text: `Room Archive Data (Page ${args.pageNumber}):\n\n${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      } catch (error) {
        log.error("Failed to fetch room archive data", { error: String(error) });
        throw error;
      }
    }
  });

    // Return the server for Smithery
  return server;
}
