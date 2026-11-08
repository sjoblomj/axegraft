// A fake game: holds the toy library's tables at the RVAs it expects, imports
// Storm by ordinal the way a game does, and reports what it finds once its own
// code runs.

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include "game_image.h"

extern "C" __declspec(dllimport) BOOL WINAPI SFileOpenArchive(LPCSTR, DWORD, DWORD, HANDLE *);

int main()
{
	HANDLE archive;
	SFileOpenArchive("base.mpq", 0, 0, &archive);

	const char *path = getenv("AXEGRAFT_FAKE_REPORT");
	FILE *report = path ? fopen(path, "a") : NULL;
	if (!report)
		return 1;
	volatile BYTE *base = (BYTE *)GetModuleHandleA(NULL);
	fprintf(report, "reached=1\nloaded_at=%08lX\nsupply=%02x%02x\n", (DWORD)base, base[0x6000], base[0x6001]);
	fclose(report);
	return 0;
}
