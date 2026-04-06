import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { LogOut, CheckCircle2, XCircle, Coffee, Activity, TrendingUp, CalendarDays } from "lucide-react";
import { parseISO } from "date-fns";

interface AttendanceRecord {
  date: string;
  status: string;
}

interface Holiday {
  date: string | Date;
  name?: string;
}

const StudentAttendance = () => {
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [metrics, setMetrics] = useState({ present: 0, absent: 0, holidays: 0, workingDays: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState<Date>(new Date());
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      try {
        const authData = localStorage.getItem("bioattend-auth");
        const auth = authData ? JSON.parse(authData) : null;
        
        if (!auth?.isAuthenticated || !auth?.userId) {
          throw new Error("You must be logged in to view this data.");
        }
        
        const rollNo = auth.userId;
        const currentCollege = auth.college || '';

        // 1. Fetch Attendance and Holidays in parallel
        const [historyRes, holidayRes] = await Promise.all([
          supabase.from("today_attendence").select("date, status").eq("roll_no", rollNo).eq('college', currentCollege),
          supabase.from("holidays").select("date, name")
        ]);

        if (historyRes.error) throw historyRes.error;

        const records = historyRes.data || [];
        const fetchedHolidays = holidayRes.data || [];

        setAttendanceHistory(records);
        setHolidays(fetchedHolidays);

        // 2. Calculate Metrics
        const presentCount = records.filter(r => r.status?.toLowerCase() === "present").length;
        const absentCount = records.filter(r => r.status?.toLowerCase() === "absent").length;
        const totalRecordedDays = presentCount + absentCount;
        const percentage = totalRecordedDays > 0 ? (presentCount / totalRecordedDays) * 100 : 0;

        setMetrics({ 
          present: presentCount, 
          absent: absentCount, 
          holidays: fetchedHolidays.length, 
          workingDays: totalRecordedDays 
        });
        
        setAttendancePercentage(Math.min(100, parseFloat(percentage.toFixed(2))));
      } catch (error: any) {
        console.error("Fetch Error:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [toast]);

  const handleLogout = () => {
    localStorage.removeItem("bioattend-auth");
    navigate("/login");
  };

  const presentDates = useMemo(() => 
    attendanceHistory.filter(r => r.status.toLowerCase() === 'present').map(r => parseISO(r.date)),
  [attendanceHistory]);

  const absentDates = useMemo(() => 
    attendanceHistory.filter(r => r.status.toLowerCase() === 'absent').map(r => parseISO(r.date)),
  [attendanceHistory]);

  const holidayDates = useMemo(() => 
    holidays.map(h => parseISO(typeof h.date === 'string' ? h.date : h.date.toISOString())),
  [holidays]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 px-6 py-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl"><Activity className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-xl font-bold">My Dashboard</h1>
              <p className="text-sm text-gray-500">Live Attendance Tracking</p>
            </div>
          </div>
          <Button variant="ghost" className="rounded-xl" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-white/90">Overall Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-6xl font-black">{attendancePercentage}%</span>
              <Progress value={attendancePercentage} className="mt-6 h-2 bg-white/20" />
            </CardContent>
          </Card>

          <Card className="shadow-sm rounded-3xl flex flex-col items-center justify-center p-6">
            <div className="bg-green-100 p-4 rounded-full mb-3"><CheckCircle2 className="h-8 w-8 text-green-600" /></div>
            <h3 className="text-3xl font-bold">{metrics.present}</h3>
            <p className="text-sm text-gray-500 uppercase">Days Present</p>
          </Card>

          <Card className="shadow-sm rounded-3xl flex flex-col items-center justify-center p-6">
            <div className="bg-yellow-100 p-4 rounded-full mb-3"><Coffee className="h-8 w-8 text-yellow-600" /></div>
            <h3 className="text-3xl font-bold">{metrics.holidays}</h3>
            <p className="text-sm text-gray-500 uppercase">Holidays Sync'd</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-sm rounded-3xl">
            <CardHeader><CardTitle>Calendar</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="multiple"
                month={month}
                onMonthChange={setMonth}
                modifiers={{ present: presentDates, absent: absentDates, holiday: holidayDates }}
                modifiersStyles={{
                  present: { backgroundColor: '#10b981', color: 'white' },
                  absent: { backgroundColor: '#ef4444', color: 'white' },
                  holiday: { backgroundColor: '#f59e0b', color: 'white' }
                }}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b"><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {attendanceHistory.map((record, idx) => (
                <div key={idx} className="p-4 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {record.status === 'present' ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                    <span>{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>{record.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentAttendance;
