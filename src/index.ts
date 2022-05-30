import './styles.css';
import {
	ConsoleLogger,
	DefaultDeviceController,
	DefaultMeetingSession,
	LogLevel,
	MeetingSession,
	MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';

class Demo {
	private roster: { [key: string]: any } = {};
	constructor() {
		const joinMeetingForm = document.getElementById('form-authenticate');
		joinMeetingForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const attendeeName = (
				document.getElementById('attendee-name') as HTMLInputElement
			).value;
			const meetingName = (
				document.getElementById('meeting-name') as HTMLInputElement
			).value;

			const response = await fetch(
				`http://127.0.0.1:8080/join?meetingName=${meetingName}&attendeeName=${attendeeName}`,
				{
					method: 'POST',
				}
			);
			const joinInfo = await response.json();
			await this.initializeAndStartMeetingSession(joinInfo);
		});
	}

	private async initializeAndStartMeetingSession(
		joinInfo: any
	): Promise<void> {
		const logger = new ConsoleLogger('SDK', LogLevel.INFO);
		const deviceController = new DefaultDeviceController(logger);
		const { meeting, attendee } = joinInfo;
		const meetingSessionConfiguration = new MeetingSessionConfiguration(
			meeting,
			attendee
		);
		const meetingSession = new DefaultMeetingSession(
			meetingSessionConfiguration,
			logger,
			deviceController
		);
		this.setupSubscriptions(meetingSession);
		await this.listAndStartDevices(meetingSession);
		meetingSession.audioVideo.start();
	}

	private setupSubscriptions(meetingSession: MeetingSession): void {
		const callback = (
			attendeeId: string,
			present: boolean,
			_exteralUserId: string,
			dropped: boolean
		) => {
			if (present) {
				this.roster[attendeeId] = present;
			} else {
				delete this.roster[attendeeId];
			}
			if (dropped) {
				delete this.roster[attendeeId];
			}
			document.getElementById('roster-state').innerText = JSON.stringify(
				this.roster,
				null,
				2
			);
		};
		meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(
			callback
		);
	}

	private async listAndStartDevices(
		meetingSession: MeetingSession
	): Promise<void> {
		const audioInputDevices =
			await meetingSession.audioVideo.listAudioInputDevices();
		const audioOutputDevices =
			await meetingSession.audioVideo.listAudioOutputDevices();
		await meetingSession.audioVideo.startAudioInput(
			audioInputDevices[0].deviceId
		);
		await meetingSession.audioVideo.chooseAudioOutput(
			audioOutputDevices[0].deviceId
		);
	}
}

window.addEventListener('load', () => {
	new Demo();
});
