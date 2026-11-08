// A stand-in for Storm.dll, exporting by ordinal as the real one does. MPQs are
// never read, because AxeGraft Patcher doesn't read them.
//
// Nothing can answer a real message box in these tests, and Storm is loaded
// before any plugin, so it also replaces MessageBox with a function that
// records the text and clicks OK.

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

static void report(const char *text)
{
	const char *path = getenv("AXEGRAFT_FAKE_REPORT");
	if (!path)
		return;
	FILE *file = fopen(path, "a");
	if (!file)
		return;
	fputs("box=", file);
	for (const char *c = text; *c; c++)
		if (*c != '\r')
			fputc(*c == '\n' ? '|' : *c, file);
	fputc('\n', file);
	fclose(file);
}

static int WINAPI answerW(HWND, LPCWSTR text, LPCWSTR, UINT)
{
	static char utf8[16384];
	WideCharToMultiByte(CP_UTF8, 0, text, -1, utf8, sizeof(utf8), NULL, NULL);
	report(utf8);
	return IDOK;
}

static int WINAPI answerA(HWND, LPCSTR text, LPCSTR, UINT)
{
	report(text);
	return IDOK;
}

static void redirect(HMODULE module, const char *name, void *to)
{
	BYTE *from = (BYTE *)GetProcAddress(module, name);
	DWORD old;
	if (!from || !VirtualProtect(from, 5, PAGE_EXECUTE_READWRITE, &old))
		return;
	from[0] = 0xE9;
	*(DWORD *)(from + 1) = (BYTE *)to - (from + 5);
	VirtualProtect(from, 5, old, &old);
	FlushInstructionCache(GetCurrentProcess(), from, 5);
}

BOOL WINAPI DllMain(HINSTANCE, DWORD reason, LPVOID)
{
	if (reason == DLL_PROCESS_ATTACH)
	{
		HMODULE user32 = LoadLibraryA("user32.dll");
		redirect(user32, "MessageBoxW", (void *)answerW);
		redirect(user32, "MessageBoxA", (void *)answerA);
	}
	return TRUE;
}

extern "C"
{
	__declspec(dllexport) BOOL WINAPI SFileCloseArchive(HANDLE) { return TRUE; }
	__declspec(dllexport) BOOL WINAPI SFileCloseFile(HANDLE) { return TRUE; }
	__declspec(dllexport) BOOL WINAPI SFileOpenArchive(LPCSTR, DWORD, DWORD, HANDLE *archive)
	{
		*archive = (HANDLE)1;
		return TRUE;
	}
	__declspec(dllexport) BOOL WINAPI SFileOpenFileEx(HANDLE, LPCSTR, DWORD, HANDLE *)
	{
		SetLastError(ERROR_FILE_NOT_FOUND);
		return FALSE;
	}
	__declspec(dllexport) BOOL WINAPI SFileReadFile(HANDLE, LPVOID, DWORD, LPDWORD, LPOVERLAPPED) { return FALSE; }
}
