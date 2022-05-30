const http = require('http');
const aws = require('aws-sdk');
const url = require('url');
const { v4: uuidV4 } = require('uuid');
const { resolve } = require('dns');

const hostName = '127.0.0.1';
const port = 8080;

const chime = new aws.Chime({ region: 'us-east-1' });
chime.endpoint = new aws.Endpoint(
	'https://service.chime.aws.amazon.com/console'
);

const server = http.createServer(async (req, res) => {
	const parsedURL = url.parse(req.url, true);
	if (req.method === 'POST' && parsedURL.pathname === '/join') {
		handleJoinRequest(
			parsedURL.query.meetingName,
			parsedURL.query.attendeeName,
			res
		);
	}
});

const meetingList = {};

const handleJoinRequest = async (meetingName, attendeeName, res) => {
	try {
		if (!meetingList[meetingName]) {
			meetingList[meetingName] = await chime
				.createMeeting({
					ClientRequestToken: uuidV4(),
					MediaRegion: 'us-east-1',
					ExternalMeetingId: meetingName.substring(0, 64),
				})
				.promise();
		}
		const meeting = meetingList[meetingName];

		const attendee = await chime
			.createAttendee({
				MeetingId: meeting.Meeting.MeetingId,
				ExternalUserId: attendeeName,
			})
			.promise();
		respond(res, 200, { meeting, attendee });
	} catch (error) {}

	const respong = (res, statusCode, data) => {
		res.statusCode = statusCode;
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.end(JSON.stringify(data));
	};
};

server.listen(port, hostName, (e) => {
	if(e){
		console.log("Error: " + e);
	}else console.log(`Server running at http://${hostName}:${port}/`);
});
