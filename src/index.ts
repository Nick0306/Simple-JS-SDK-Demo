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
			console.log("ATTENDEE NAME: " + attendeeName);
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


//Roster Updater Function
	updateRoster(): void {
		let trig = true;
		for(const attendeeId in this.roster){
			if(trig){
				document.getElementById('roster-state').innerText = '';
				trig = false;
			}
			let status : string[] = [];
			//console.log("REACHED FUNCTION");
			status.push(attendeeId.toString());
			if(this.roster[attendeeId].muted){
				status.push("MUTED");
			}else if(!(this.roster[attendeeId].muted)){
				status.push("UNMUTED")
			}
			document.getElementById('roster-state').innerText += "\n" + status.toString();
		}
		
	}


	private async initializeAndStartMeetingSession(joinInfo: any): Promise<void> {
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
		await this.listAndStartDevices(meetingSession);
		this.setupSubscriptions(meetingSession);
		meetingSession.audioVideo.start();
	}

	private setupSubscriptions(meetingSession: MeetingSession): void {
		const callback = (attendeeId: string, present: boolean, _exteralUserId: string, dropped: boolean) => {
			if(present){
				this.roster[attendeeId] = {
					...this.roster[attendeeId],
					... { name: _exteralUserId.split('#').slice(-1)[0] }
				};
			}
			if (!present || dropped) {
				delete this.roster[attendeeId];
				this.updateRoster();
			}
			meetingSession.audioVideo.realtimeSubscribeToVolumeIndicator( attendeeId, (attendeeId, volume, muted, signalStrength) => {
				// A null value for volume, muted and signalStrength field means that it has not changed.
				if (muted !== null) {
					this.roster[attendeeId].muted = muted;
					this.updateRoster();
				}
			});
		};

		const audioElement = document.getElementsByTagName('audio')[0];
		document.getElementById('mute').addEventListener('click', () => {
			
			if(meetingSession.audioVideo.realtimeIsLocalAudioMuted()){
				meetingSession.audioVideo.realtimeUnmuteLocalAudio();
			}else{
				meetingSession.audioVideo.realtimeMuteLocalAudio();
			}

		});

		
		meetingSession.audioVideo.bindAudioElement(audioElement);
		meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);
	}

	private async listAndStartDevices(meetingSession: MeetingSession): Promise<void> {
		const audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
		const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
		//const videoInputDevices = await meetingSession.audioVideo.listVideoInputDevices();
		await meetingSession.audioVideo.startAudioInput(audioInputDevices[0].deviceId);
		await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
		/*await meetingSession.audioVideo.startVideoInput(videoInputDevices[0].deviceId);
		const videoElement = document.getElementsByTagName('video')[0];
		
		const observer = {
			// videoTileDidUpdate is called whenever a new tile is created or tileState changes.
			videoTileDidUpdate: (tileState: { boundAttendeeId: any; localTile: any; tileId: number; }) => {
			  // Ignore a tile without attendee ID and other attendee's tile.
			  if (!tileState.boundAttendeeId || !tileState.localTile) {
				return;
			  }
			  
			  meetingSession.audioVideo.bindVideoElement(tileState.tileId, videoElement);
			  console.log('BOUND')
			}
		  };
	
		meetingSession.audioVideo.addObserver(observer);
		meetingSession.audioVideo.startLocalVideoTile();*/
	}
}

window.addEventListener('load', () => {
	new Demo();
});
