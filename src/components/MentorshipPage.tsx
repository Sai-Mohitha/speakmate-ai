import { useState, type FormEvent } from "react";
import { Calendar, CheckCircle2, Clock, Info, Trash2, X } from "lucide-react";
import { SAMPLE_COACHES } from "../data/demoData";
import type { CoachProfile, MentorshipBooking, UserProfile } from "../types";

interface MentorshipPageProps {
  user: UserProfile;
  bookings: MentorshipBooking[];
  onSaveBooking: (booking: MentorshipBooking) => void;
  onDeleteBooking: (bookingId: string) => void;
}

export function MentorshipPage({
  user,
  bookings,
  onSaveBooking,
  onDeleteBooking,
}: MentorshipPageProps) {
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [sessionPurpose, setSessionPurpose] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const minDate = new Date().toISOString().slice(0, 10);

  function openBookingModal(coach: CoachProfile) {
    setSelectedCoach(coach);
    setPreferredDate(minDate);
    setPreferredTime(coach.availableSlots[0] ?? "10:00 AM");
    setSessionPurpose("");
    setFormError(null);
  }

  function handleBookingSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCoach) return;
    setFormError(null);

    if (!preferredDate) {
      setFormError("Please select a preferred date.");
      return;
    }
    if (!preferredTime) {
      setFormError("Please select a preferred time.");
      return;
    }
    if (sessionPurpose.trim().length < 8) {
      setFormError("Please briefly describe your session purpose (at least 8 characters).");
      return;
    }

    const newBooking: MentorshipBooking = {
      id: `booking_${Date.now()}`,
      userId: user.id,
      coachId: selectedCoach.id,
      coachName: selectedCoach.name,
      coachExpertise: selectedCoach.expertise,
      preferredDate,
      preferredTime,
      sessionPurpose: sessionPurpose.trim(),
      createdAt: new Date().toISOString(),
      status: "Demo Request Saved",
      isDemoBooking: true,
    };

    onSaveBooking(newBooking);
    setSuccessNotice(
      `Mentorship session with ${selectedCoach.name} for ${preferredDate} at ${preferredTime} has been confirmed.`
    );
    setSelectedCoach(null);
  }

  return (
    <div className="space-y-6">
      {/* Mentorship Overview Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E6E8F0] bg-white p-4 text-sm text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#635BDB]" />
        <div>
          <p className="font-semibold text-[#141726]">1-on-1 Communication Mentorship</p>
          <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
            Browse specialist coaches across executive presence, interviews, and workplace fluency.
            Session requests are saved directly to your workspace so you can manage your upcoming
            coaching schedule.
          </p>
        </div>
      </div>

      {successNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sample Coach Cards */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {SAMPLE_COACHES.map((coach) => {
          const initials = coach.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join("");

          return (
            <article
              key={coach.id}
              className="flex flex-col justify-between rounded-xl border border-[#E6E8F0] bg-white p-6"
            >
              <div>
                <div className="flex items-start gap-4">
                  {!failedAvatars[coach.id] ? (
                    <img
                      src={coach.avatarUrl}
                      alt={`Portrait of ${coach.name}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedAvatars((prev) => ({ ...prev, [coach.id]: true }))
                      }
                      className="h-16 w-16 shrink-0 rounded-xl border border-[#E6E8F0] object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#E6E8F0] bg-[#F0EEFF] text-base font-bold text-[#635BDB]">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight text-[#141726]">
                      {coach.name}
                    </h3>
                    <p className="text-xs font-medium text-[#635BDB]">{coach.expertise}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">{coach.sampleExperience}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#4B5563]">{coach.biography}</p>

                <p className="mt-3 text-xs text-[#6B7280]">
                  <span className="font-medium text-[#374151]">Focus areas:</span>{" "}
                  {coach.focusAreas.join(" · ")}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E6E8F0] pt-4">
                <span className="font-mono text-xs text-[#6B7280] tabular-nums">
                  Slots: {coach.availableSlots.join(", ")}
                </span>
                <button
                  type="button"
                  onClick={() => openBookingModal(coach)}
                  className="rounded-lg bg-[#635BDB] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5249C9] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Book a Session
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* Scheduled Sessions Section */}
      <section className="rounded-xl border border-[#E6E8F0] bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#141726]">
              Your Scheduled Sessions
            </h3>
            <p className="text-xs text-[#6B7280]">
              {user.authProvider === "google"
                ? "Synced to your account via Cloud Firestore."
                : "Saved in your local browser workspace."}
            </p>
          </div>
          <span className="font-mono text-xs font-medium text-[#6B7280] tabular-nums">
            {bookings.length} {bookings.length === 1 ? "session" : "sessions"}
          </span>
        </div>

        {bookings.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[#D1D5DB] bg-[#F8F9FC] p-6 text-center text-sm text-[#6B7280]">
            No mentorship sessions scheduled yet. Choose a coach above and click &ldquo;Book a
            Session&rdquo; to reserve a time slot.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#E6E8F0]">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-[#141726]">
                    {booking.coachName}{" "}
                    <span className="text-xs font-normal text-[#635BDB]">
                      · {booking.coachExpertise}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-[#4B5563]">{booking.sessionPurpose}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Calendar className="h-3.5 w-3.5" />
                      {booking.preferredDate}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      {booking.preferredTime}
                    </span>
                    <span>Status: Confirmed</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteBooking(booking.id)}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#E6E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5563] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:self-center cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Cancel Session
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking Form Modal */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141726]/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#635BDB]">Schedule Mentorship Session</p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-[#141726]">
                  {selectedCoach.name}
                </h3>
                <p className="text-xs text-[#6B7280]">{selectedCoach.expertise}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCoach(null)}
                aria-label="Close booking modal"
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F1F3F6] hover:text-[#141726] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="booking-coach"
                  className="block text-xs font-medium text-[#374151]"
                >
                  Selected Coach
                </label>
                <input
                  id="booking-coach"
                  type="text"
                  readOnly
                  value={selectedCoach.name}
                  className="mt-1 block w-full rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] px-3 py-2 text-sm text-[#4B5563]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="booking-date"
                    className="block text-xs font-medium text-[#374151]"
                  >
                    Preferred Date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    min={minDate}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 font-mono text-sm text-[#141726] tabular-nums focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-time"
                    className="block text-xs font-medium text-[#374151]"
                  >
                    Preferred Time
                  </label>
                  <select
                    id="booking-time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
                  >
                    {selectedCoach.availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-purpose"
                  className="block text-xs font-medium text-[#374151]"
                >
                  Session Purpose
                </label>
                <textarea
                  id="booking-purpose"
                  rows={3}
                  value={sessionPurpose}
                  onChange={(e) => setSessionPurpose(e.target.value)}
                  placeholder="e.g., Practice answers for upcoming internship HR interview and improve clarity."
                  required
                  className="mt-1 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#141726] placeholder:text-[#9CA3AF] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
                />
              </div>

              <p className="text-xs text-[#6B7280]">
                Session requests are saved to your SpeakMate AI schedule with no upfront charge.
              </p>

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                >
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCoach(null)}
                  className="rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-medium text-[#374151] hover:bg-[#F8F9FC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#635BDB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5249C9] cursor-pointer"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
