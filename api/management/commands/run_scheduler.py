import signal
import sys
import logging
from django.core.management.base import BaseCommand
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from api.scheduler import run_market_data_ingestion_job, logger


class Command(BaseCommand):
    help = 'Boots the autonomous market data ingestion background scheduler (APScheduler).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=0,
            help='Run the ingestion job continuously every N seconds (ideal for dev/testing).'
        )
        parser.add_argument(
            '--cron',
            type=str,
            default='16:30',
            help='Daily cron run time in HH:MM format (default: 16:30 for US market close).'
        )
        parser.add_argument(
            '--run-now',
            action='store_true',
            help='Execute an immediate ingestion cycle upon starting the scheduler.'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        cron_time = options['cron']
        run_now = options['run_now']

        self.stdout.write(self.style.MIGRATE_HEADING("=================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING(" KAPPA ANALYTICS AUTONOMOUS MARKET SCHEDULER WORKER "))
        self.stdout.write(self.style.MIGRATE_HEADING("=================================================="))


        if run_now:
            self.stdout.write(self.style.WARNING("[!] Initializing Immediate Ingestion Run..."))
            try:
                run_market_data_ingestion_job()
            except Exception as e:
                logger.error(f"Error during immediate ingestion run: {e}")

        scheduler = BlockingScheduler()

        if interval > 0:
            trigger = IntervalTrigger(seconds=interval)
            self.stdout.write(self.style.SUCCESS(f"[+] Scheduler Trigger Mode: INTERVAL (Every {interval} seconds)"))
        else:
            try:
                hour, minute = cron_time.split(':')
                trigger = CronTrigger(hour=int(hour), minute=int(minute))
                self.stdout.write(self.style.SUCCESS(f"[+] Scheduler Trigger Mode: DAILY CRON (At {cron_time} Daily)"))
            except Exception:
                self.stdout.write(self.style.ERROR(f"[X] Invalid --cron format '{cron_time}'. Use HH:MM format."))
                sys.exit(1)

        scheduler.add_job(
            run_market_data_ingestion_job,
            trigger=trigger,
            id='market_data_ingestion_job',
            name='Daily Market Data & Technical Analysis Pipeline',
            replace_existing=True
        )

        def shutdown_handler(signum, frame):
            self.stdout.write(self.style.WARNING("\n[!] Gracefully shutting down NEXUS QUANT Scheduler..."))
            if scheduler.running:
                scheduler.shutdown(wait=False)
            self.stdout.write(self.style.SUCCESS("[+] Scheduler terminated cleanly."))
            sys.exit(0)

        signal.signal(signal.SIGINT, shutdown_handler)
        signal.signal(signal.SIGTERM, shutdown_handler)

        self.stdout.write(self.style.SUCCESS("[+] Scheduler background worker active. Press Ctrl+C to terminate.\n"))
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            shutdown_handler(None, None)
