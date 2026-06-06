from django.core.management.base import BaseCommand

from newsapp.attendance_reminders import process_attendance_reminders


class Command(BaseCommand):
    help = "Send attendance reminder emails and auto clock out active users at 8:00 PM."

    def handle(self, *args, **options):
        summary = process_attendance_reminders()
        self.stdout.write(
            self.style.SUCCESS(
                "Attendance reminder job completed. "
                f"Clock-in reminders: {summary['clock_in_first_sent']} first, {summary['clock_in_second_sent']} second. "
                f"Clock-out reminders: {summary['clock_out_first_sent']} first, {summary['clock_out_second_sent']} second. "
                f"Auto clock-outs: {summary['auto_clocked_out']}."
            )
        )
