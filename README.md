# Tinder Music

This project was used during a networked music piece designed for audience participation at a music concert. 
We developed a networked musical instrument for the web browser where a casual smartphone user can play music as well as interact with other audience members. 
A participant composes a short tune with five notes and serving as a personal profile picture of each individual throughout the piece. 
The notion of musical profiles is used to form a social network that mimics an online-dating website. People browse the profiles of others, choose someone they like, and initiate interaction online and offline. 
We utilize a cloud service that helps build, without a server-side programming, a large-scale networked music ensemble on the web. 

Here you can find some message descriptions.

## project description (intended for advanced users only)

tinder-audience-participation

case 0 - performance status

callback: (from performer to everybody when someone connect, or when performer press some button?!)
{
	type : "performance",
	status : [started,stopped]	// wait can stop all
}

case 1 - creating name

send: (from one audience member to performer)
{
	type : "create",
	my_id : [unique my_id generated from audience.js],
	nickname : [user typed id, alphabets, numbers, dot, underscore allowed, shorter than 12. ]
}

response if successful: (from performer to one audience member)
{
	type : "create-response",
	res : "s",
	index : [number representing the index of the nick name on the table]
}

response if fail: (from performer to one audience member)
{
	type : "create-response",
	res : "f"
}


case 2 - update tinder complete

send: (from one audience member to performer)
{
	type : "update",
	index : [index returned on create-response],
	tm : [string with the tindermusic?!]
}

response when updated if
- we have some tinder music is available: (from performer to one audience member)
{
	type : "update-response",
	suggested_tm : {
		nickname : [nickname from the owner of the tinder music],
		index : [index from the owner of the tinder music],
		tm: [string with the tinder music?!]
		}
}

response when updated if
- we don't have some tinder music available: (from performer to one audience member)
{
	type : "update-response",
	suggested_tm : ""
}


case 3 - request next tinder music

send: (from one audience member to performer)
{
	type : "next",
	index : [index returned on create-response]
}

response if we have some next tinder music: (from performer to one audience member)
{
	type : "next-response",
	suggested_tm : {
		nickname : [nickname from the owner of the tinder music],
		index : [index from the owner of the tinder music],
		tm: [string with the tinder music?!]
		}
}

response if we don't have tinder music available: (from performer to one audience member)
{
	type : "next-response",
	suggested_tm : ""
}

case 4 - go back to editing mode

send: (from one audience member to performer)
{
	type : "editing",
	index : [index returned on create-response]
}

response: (from performer to audience member)
{
	type: "editing-response",
	tm: [string with the tinder music?!]
}

case 4 a - user goes to edit mode and send message to the followers

send: (from performer to all followers of this audience member)
{
	type: "user-editing" // can I add the next tinder music here and save one message?!
}

case 5 - performer set user as unavailable and send message to the followers

send: (from performer to all followers of this audience member)
{
	type: "user-unavailable" // can I add the next tinder music here and save one message?!
}
