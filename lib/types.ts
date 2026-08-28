// A passage from the document that an answer was built from.
export type Source = {
	page: number;
	score: number;
	// Truncated chunk text. The full text stays in the database.
	preview: string;
};

export type Message = {
	role: 'user' | 'assistant';
	text: string;
	sources?: Source[];
};
