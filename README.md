# tindermusic
tinder-audience-participation

case 1 - creating name ( from one audience member to performer)

send:
{
	type : "create",
	my_id : [unique my_id generated from audience.js],
	nickname : [user typed id, alphabets, numbers, dot, underscore allowed, shorter than 12. ]
}

response if successful:
{
	type : "create-response",
	res : "s",
	index : [number representing the index of the nick name on the table]
}

response if fail:
{
	type : "create-response",
	res : "f"
}


case 2 - update tinder complete ( from one audience member to performer)

send:
{
	type : "update",
	index : [index returned on create-response],
	tm : [string with the tindermusic?!]
}

response when updated if
- we have some tinder music is available:
{
	type : "update-response",
	suggested_tm : {
		nickname : [nickname from the owner of the tinder music],
		index : [index from the owner of the tinder music],
		tm: [string with the tinder music?!]
		}
}

response when updated if
- we don't have some tinder music available:
{
	type : "update-response",
	suggested_tm : ""
}



case a - user goes to edit mode and send message to the followers (from performer)

send:
{
	type: "user-unavailable"
}
