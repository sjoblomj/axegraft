// A stand-in for MPQDraft: loads the real plugin DLL and calls it through C++
// virtual calls compiled by a C++ compiler, the way MPQDraft does. It carries
// out the operations named on its command line and prints what it sees as
// key=value lines for the tests to check.
//
// The dialogs and VirtualProtect are replaced by rewriting the DLL's import
// table, so the DLL under test contains no test code for them.
//
// Built with -DGAME, the host is also a game the fixture library recognises:
// game_image.h places an unmodified image of its tables at the right RVAs.
//
// The interfaces are declared as in MPQDraft's src/core/MPQDraftPlugin.h.

#include <windows.h>
#include <commdlg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef GAME
#include "game_image.h"
#endif

#define MPQDRAFT_MAX_PATH 264

#pragma pack(push, 1)
struct MPQDRAFTPLUGINMODULE
{
	DWORD dwComponentID;
	DWORD dwModuleID;
	BOOL bExecute;
	char szModuleFileName[MPQDRAFT_MAX_PATH];
};
#pragma pack(pop)

struct IMPQDraftServer
{
	virtual BOOL WINAPI GetPluginModule(DWORD dwPluginID, DWORD dwModuleID, LPSTR lpszFileName) = 0;
};

struct IMPQDraftPlugin
{
	virtual BOOL WINAPI Identify(LPDWORD lpdwPluginID) = 0;
	virtual BOOL WINAPI GetPluginName(LPSTR lpszPluginName, DWORD nNameBufferLength) = 0;
	virtual BOOL WINAPI CanPatchExecutable(LPCSTR lpszEXEFileName) = 0;
	virtual BOOL WINAPI Configure(HWND hParentWnd) = 0;
	virtual BOOL WINAPI ReadyForPatch() = 0;
	virtual BOOL WINAPI GetModules(MPQDRAFTPLUGINMODULE *lpPluginModules, LPDWORD lpnNumModules) = 0;
	virtual BOOL WINAPI InitializePlugin(IMPQDraftServer *lpMPQDraftServer) = 0;
	virtual BOOL WINAPI TerminatePlugin() = 0;
};

typedef BOOL (WINAPI *GetMPQDraftPluginPtr)(IMPQDraftPlugin **);

// What the replaced functions do.
static const char *g_pick = NULL; // The file the dialog "chooses"; NULL cancels it.
static char g_log[MAX_PATH] = ""; // Where the log should be, once the temp folder is set.
static enum { PROTECT_NORMAL, PROTECT_FAIL, PROTECT_KILL } g_protect = PROTECT_NORMAL;
static BOOL (WINAPI *g_real_protect)(LPVOID, SIZE_T, DWORD, PDWORD) = VirtualProtect;

static int WINAPI fake_MessageBoxW(HWND, LPCWSTR text, LPCWSTR, UINT)
{
	static char utf8[16384];
	WideCharToMultiByte(CP_UTF8, 0, text, -1, utf8, sizeof(utf8), NULL, NULL);
	printf("message_box=");
	for (char *c = utf8; *c; c++)
		if (*c != '\r')
			putchar(*c == '\n' ? '|' : *c);
	putchar('\n');
	if (g_log[0])
	{
		// Only opens if the plugin has closed the log.
		HANDLE file = CreateFileA(g_log, GENERIC_READ, 0, NULL, OPEN_EXISTING, 0, NULL);
		printf("log_closed_at_box=%d\n", file != INVALID_HANDLE_VALUE);
		if (file != INVALID_HANDLE_VALUE)
		{
			printf("log_bytes_at_box=%lu\n", GetFileSize(file, NULL));
			CloseHandle(file);
		}
	}
	return IDOK;
}

static BOOL WINAPI fake_GetOpenFileNameA(LPOPENFILENAMEA ofn)
{
	printf("dialog_filter_json=%d\n", strstr(ofn->lpstrFilter, "*.json") != NULL);
	printf("dialog_initial=%s\n", ofn->lpstrFile);
	if (!g_pick)
		return FALSE;
	strcpy(ofn->lpstrFile, g_pick);
	return TRUE;
}

static BOOL WINAPI fake_VirtualProtect(LPVOID address, SIZE_T size, DWORD protect, PDWORD old)
{
	if (g_protect == PROTECT_KILL)
		TerminateProcess(GetCurrentProcess(), 7);
	if (g_protect == PROTECT_FAIL)
		return FALSE;
	return g_real_protect(address, size, protect, old);
}

// Points the DLL's import of a function at a replacement.
static void hook(HMODULE module, const char *name, void *replacement)
{
	BYTE *base = (BYTE *)module;
	IMAGE_NT_HEADERS32 *nt = (IMAGE_NT_HEADERS32 *)(base + ((IMAGE_DOS_HEADER *)base)->e_lfanew);
	IMAGE_DATA_DIRECTORY *dir = &nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT];
	IMAGE_IMPORT_DESCRIPTOR *d = (IMAGE_IMPORT_DESCRIPTOR *)(base + dir->VirtualAddress);
	for (; d->Name; d++)
	{
		DWORD *names = (DWORD *)(base + d->OriginalFirstThunk);
		DWORD *thunks = (DWORD *)(base + d->FirstThunk);
		for (int i = 0; names[i]; i++)
		{
			if (names[i] & 0x80000000)
				continue;
			IMAGE_IMPORT_BY_NAME *by = (IMAGE_IMPORT_BY_NAME *)(base + names[i]);
			if (strcmp((const char *)by->Name, name))
				continue;
			DWORD old;
			g_real_protect(&thunks[i], 4, PAGE_READWRITE, &old);
			thunks[i] = (DWORD)replacement;
			g_real_protect(&thunks[i], 4, old, &old);
		}
	}
}

// MPQDraft's side of InitializePlugin.
struct Server : IMPQDraftServer
{
	const char *path;
	BOOL WINAPI GetPluginModule(DWORD plugin, DWORD module, LPSTR file) override
	{
		printf("server_asked=%08lX:%lu\n", plugin, module);
		if (!path)
			return FALSE;
		strcpy(file, path);
		return TRUE;
	}
};

static void modules(IMPQDraftPlugin *plugin)
{
	DWORD count = 99;
	BOOL ok = plugin->GetModules(NULL, &count);
	printf("modules_ok=%d\nmodules_count=%lu\n", ok, count);
	if (!count)
		return;
	static MPQDRAFTPLUGINMODULE list[4];
	memset(list, 0, sizeof(list));
	DWORD returned = count;
	ok = plugin->GetModules(list, &returned);
	printf("modules_list_ok=%d\nmodules_returned=%lu\n", ok, returned);
	for (DWORD i = 0; i < returned; i++)
		printf("module=%08lX:%lu:%d:%s\n", list[i].dwComponentID, list[i].dwModuleID, list[i].bExecute, list[i].szModuleFileName);
}

static void version(const char *dll)
{
	DWORD handle;
	DWORD size = GetFileVersionInfoSizeA(dll, &handle);
	char *info = (char *)malloc(size + 1);
	if (!size || !GetFileVersionInfoA(dll, 0, size, info))
	{
		printf("version_info=0\n");
		return;
	}
	const char *names[] = {"ProductName", "FileDescription", "ProductVersion", "FileVersion"};
	for (int i = 0; i < 4; i++)
	{
		char query[128];
		sprintf(query, "\\StringFileInfo\\040904B0\\%s", names[i]);
		char *value = NULL;
		UINT length = 0;
		if (VerQueryValueA(info, query, (LPVOID *)&value, &length) && value)
			printf("%s=%s\n", names[i], value);
	}
}

static void perform(const char *dll, IMPQDraftPlugin *plugin, const char *op)
{
	static Server server;
	BYTE *base = (BYTE *)GetModuleHandleA(NULL);
	unsigned rva, length;
	if (!strcmp(op, "load"))
		return;
	if (!strcmp(op, "identify"))
	{
		DWORD id = 0;
		BOOL ok = plugin->Identify(&id);
		printf("identify=%d\nplugin_id=%08lX\n", ok, id);
	}
	else if (!strcmp(op, "name"))
	{
		char name[64] = "";
		BOOL ok = plugin->GetPluginName(name, sizeof(name));
		printf("name_ok=%d\nname=%s\n", ok, name);
	}
	else if (!strcmp(op, "name_short"))
	{
		char name[4] = "";
		printf("name_short=%d\n", plugin->GetPluginName(name, sizeof(name)));
	}
	else if (!strncmp(op, "can_patch:", 10))
		printf("can_patch=%d\n", plugin->CanPatchExecutable(op + 10));
	else if (!strcmp(op, "ready"))
		printf("ready=%d\n", plugin->ReadyForPatch());
	else if (!strncmp(op, "pick:", 5))
	{
		g_pick = op + 5;
		printf("configure=%d\n", plugin->Configure((HWND)1));
	}
	else if (!strcmp(op, "cancel"))
	{
		g_pick = NULL;
		printf("configure=%d\n", plugin->Configure((HWND)1));
	}
	else if (!strcmp(op, "modules"))
		modules(plugin);
	else if (!strncmp(op, "appdata:", 8))
		SetEnvironmentVariableA("APPDATA", op + 8);
	else if (!strncmp(op, "temp:", 5))
	{
		SetEnvironmentVariableA("TEMP", op + 5);
		SetEnvironmentVariableA("TMP", op + 5);
		sprintf(g_log, "%s\\AxeGraftPatcher.log", op + 5);
	}
	else if (!strncmp(op, "init:", 5))
	{
		server.path = op + 5;
		printf("init=%d\n", plugin->InitializePlugin(&server));
	}
	else if (!strcmp(op, "init_unlocated"))
	{
		server.path = NULL;
		printf("init=%d\n", plugin->InitializePlugin(&server));
	}
	else if (!strcmp(op, "terminate"))
		printf("terminate=%d\n", plugin->TerminatePlugin());
	else if (!strcmp(op, "protect_fail"))
		g_protect = PROTECT_FAIL;
	else if (!strcmp(op, "protect_kill"))
		g_protect = PROTECT_KILL;
	else if (sscanf(op, "peek:%x:%u", &rva, &length) == 2)
	{
		printf("peek=");
		for (unsigned i = 0; i < length; i++)
			printf("%02x", base[rva + i]);
		putchar('\n');
	}
	else if (sscanf(op, "prot:%x", &rva) == 1)
	{
		MEMORY_BASIC_INFORMATION info;
		VirtualQuery(base + rva, &info, sizeof(info));
		printf("prot=%lx\n", info.Protect);
	}
	else if (!strcmp(op, "version"))
		version(dll);
	else if (!strcmp(op, "alive"))
		printf("alive=1\n");
	else
	{
		printf("unknown operation %s\n", op);
		exit(2);
	}
}

int main(int argc, char **argv)
{
	setvbuf(stdout, NULL, _IONBF, 0);
	// Nothing is remembered between runs unless a test asks with appdata:.
	SetEnvironmentVariableA("APPDATA", NULL);
	if (argc < 3)
	{
		printf("usage: host <dll> <operation>...\n");
		return 2;
	}
	HMODULE module = LoadLibraryA(argv[1]);
	printf("loaded=%d\n", module != NULL);
	if (!module)
	{
		printf("load_error=%lu\n", GetLastError());
		return 1;
	}
	hook(module, "MessageBoxW", (void *)fake_MessageBoxW);
	hook(module, "GetOpenFileNameA", (void *)fake_GetOpenFileNameA);
	hook(module, "VirtualProtect", (void *)fake_VirtualProtect);
	GetMPQDraftPluginPtr get = (GetMPQDraftPluginPtr)GetProcAddress(module, "GetMPQDraftPlugin");
	printf("export=%d\n", get != NULL);
	if (!get)
		return 1;
	IMPQDraftPlugin *plugin = NULL;
	BOOL ok = get(&plugin);
	printf("get_plugin=%d\ninterface=%d\n", ok, plugin != NULL);
	if (!ok || !plugin)
		return 1;
	for (int i = 2; i < argc; i++)
		perform(argv[1], plugin, argv[i]);
	return 0;
}
