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


case 2 - update path complete ( from one audience member to performer)

send:
{
	type : "update",
	index : [index returned on create-response],
	path : [string with the path?!]
}

response when received:
{
	type : "update-response",
	suggested_path : {
		nickname : [nickname from the owner of the path],
		path: [string with the path?!]
		}
}
