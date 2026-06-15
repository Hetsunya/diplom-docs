import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Create Supabase clients
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-837d034e/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-837d034e/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create user with admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.error('Sign up error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already been registered') || error.code === 'email_exists') {
        return c.json({ error: 'An account with this email already exists. Please sign in instead.' }, 400);
      }
      
      return c.json({ error: error.message || 'Failed to create account' }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Sign up error:', error);
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// Get scheduled calls for a user
app.get("/make-server-837d034e/calls", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    // Get calls from KV store
    const callsData = await kv.getByPrefix(`calls:${userId}:`);
    console.log('Raw calls data from KV:', callsData);
    
    // Filter out null values and delete them from storage
    const validCallsData = [];
    const deletePromises = [];
    for (const item of callsData) {
      if (item.value == null) {
        console.log('Found null value, deleting key:', item.key);
        deletePromises.push(kv.del(item.key));
      } else {
        validCallsData.push(item);
      }
    }
    await Promise.all(deletePromises);
    
    let calls = validCallsData.map(item => item.value);

    // If no calls exist, create pre-made sample calls for the user
    if (calls.length === 0) {
      console.log('No calls found, creating sample calls for user:', userId);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const formatDate = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      };

      const formatDateISO = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      const sampleCalls = [
        {
          id: crypto.randomUUID(),
          title: 'Team Standup',
          date: formatDate(tomorrow),
          dateISO: formatDateISO(tomorrow),
          time: '09:00',
          duration: '30 min',
          participants: ['Sarah Chen', 'Michael Rodriguez', 'Emily Johnson'],
          status: 'upcoming',
          createdAt: new Date().toISOString(),
          description: 'Daily team sync to discuss progress and blockers',
        },
        {
          id: crypto.randomUUID(),
          title: 'Product Strategy Review',
          date: formatDate(dayAfterTomorrow),
          dateISO: formatDateISO(dayAfterTomorrow),
          time: '14:00',
          duration: '60 min',
          participants: ['David Kim', 'Lisa Anderson', 'James Wilson', 'Maria Garcia'],
          status: 'upcoming',
          createdAt: new Date().toISOString(),
          description: 'Quarterly product roadmap discussion and feature prioritization',
        },
        {
          id: crypto.randomUUID(),
          title: 'Client Presentation',
          date: formatDate(nextWeek),
          dateISO: formatDateISO(nextWeek),
          time: '11:00',
          duration: '45 min',
          participants: ['Robert Taylor', 'Jennifer Brown'],
          status: 'upcoming',
          createdAt: new Date().toISOString(),
          description: 'Demo of new features and Q1 progress report',
        },
      ];

      // Store all sample calls in KV store - wait for all to complete
      const storePromises = sampleCalls.map(call => 
        kv.set(`calls:${userId}:${call.id}`, call)
      );
      await Promise.all(storePromises);
      console.log('Sample calls created and stored successfully');

      calls = sampleCalls;
    }

    console.log('Returning calls:', calls);
    return c.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return c.json({ error: 'Failed to fetch calls' }, 500);
  }
});

// Create a new scheduled call
app.post("/make-server-837d034e/calls", async (c) => {
  try {
    const { userId, title, date, time, duration, participants } = await c.req.json();

    if (!userId || !title || !date || !time || !duration || !participants) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate unique ID for the call
    const callId = crypto.randomUUID();
    
    // Format the date for display
    const formatDateForDisplay = (dateStr: string) => {
      const dateObj = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
    };
    
    const newCall = {
      id: callId,
      title,
      date: formatDateForDisplay(date),
      dateISO: date,
      time,
      duration,
      participants,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    };

    // Store in KV store
    await kv.set(`calls:${userId}:${callId}`, newCall);

    return c.json({ success: true, call: newCall });
  } catch (error) {
    console.error('Error creating call:', error);
    return c.json({ error: 'Failed to create call' }, 500);
  }
});

// Get call reports for a user
app.get("/make-server-837d034e/reports/calls", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    // Get reports from KV store
    const reportsData = await kv.getByPrefix(`report:${userId}:`);
    const reports = reportsData.map(item => item.value);

    // If no reports exist, generate sample data
    if (reports.length === 0) {
      const sampleReports = [
        {
          id: '1',
          title: 'Product Strategy Meeting',
          date: 'Feb 3, 2026',
          duration: '45 min',
          participants: 4,
          avgEngagement: 78,
          emotionData: {
            Happy: 25,
            Engaged: 35,
            Focused: 20,
            Neutral: 10,
            Thoughtful: 8,
            Surprised: 2,
          },
        },
        {
          id: '2',
          title: 'Weekly Team Standup',
          date: 'Feb 2, 2026',
          duration: '30 min',
          participants: 6,
          avgEngagement: 65,
          emotionData: {
            Happy: 20,
            Engaged: 25,
            Focused: 30,
            Neutral: 15,
            Thoughtful: 7,
            Surprised: 3,
          },
        },
        {
          id: '3',
          title: 'Client Presentation',
          date: 'Feb 1, 2026',
          duration: '60 min',
          participants: 3,
          avgEngagement: 85,
          emotionData: {
            Happy: 30,
            Engaged: 40,
            Focused: 15,
            Neutral: 8,
            Thoughtful: 5,
            Surprised: 2,
          },
        },
      ];

      return c.json({ reports: sampleReports });
    }

    return c.json({ reports });
  } catch (error) {
    console.error('Error fetching call reports:', error);
    return c.json({ error: 'Failed to fetch call reports' }, 500);
  }
});

// Get organization analytics
app.get("/make-server-837d034e/reports/analytics", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    // Get analytics from KV store
    const analyticsKey = `analytics:${userId}`;
    const analyticsData = await kv.get(analyticsKey);

    // If no analytics exist, generate sample data
    if (!analyticsData) {
      const sampleAnalytics = {
        totalCalls: 24,
        totalParticipants: 87,
        avgCallDuration: 42,
        avgEngagement: 73,
        emotionTrends: [
          { date: 'Jan 28', Happy: 22, Engaged: 30, Focused: 25, Neutral: 18 },
          { date: 'Jan 29', Happy: 25, Engaged: 28, Focused: 28, Neutral: 15 },
          { date: 'Jan 30', Happy: 20, Engaged: 35, Focused: 22, Neutral: 20 },
          { date: 'Jan 31', Happy: 28, Engaged: 32, Focused: 20, Neutral: 16 },
          { date: 'Feb 1', Happy: 30, Engaged: 35, Focused: 18, Neutral: 12 },
          { date: 'Feb 2', Happy: 26, Engaged: 30, Focused: 25, Neutral: 14 },
          { date: 'Feb 3', Happy: 28, Engaged: 33, Focused: 23, Neutral: 12 },
        ],
        topEmotions: [
          { name: 'Engaged', value: 1850, percentage: 32 },
          { name: 'Happy', value: 1520, percentage: 26 },
          { name: 'Focused', value: 1380, percentage: 24 },
          { name: 'Neutral', value: 890, percentage: 15 },
          { name: 'Thoughtful', value: 180, percentage: 3 },
        ],
      };

      return c.json(sampleAnalytics);
    }

    return c.json(analyticsData);
  } catch (error) {
    console.error('Error fetching organization analytics:', error);
    return c.json({ error: 'Failed to fetch organization analytics' }, 500);
  }
});

// Save a call report after a call completes
app.post("/make-server-837d034e/reports/calls", async (c) => {
  try {
    const { userId, callId, emotionData, avgEngagement } = await c.req.json();

    if (!userId || !callId || !emotionData) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get the original call data
    const callData = await kv.get(`calls:${userId}:${callId}`);
    
    if (!callData) {
      return c.json({ error: 'Call not found' }, 404);
    }

    // Create the report
    const report = {
      ...callData,
      emotionData,
      avgEngagement: avgEngagement || 0,
      completedAt: new Date().toISOString(),
    };

    // Store the report
    await kv.set(`report:${userId}:${callId}`, report);

    // Update call status to completed
    await kv.set(`calls:${userId}:${callId}`, { ...callData, status: 'completed' });

    return c.json({ success: true, report });
  } catch (error) {
    console.error('Error saving call report:', error);
    return c.json({ error: 'Failed to save call report' }, 500);
  }
});

Deno.serve(app.fetch);