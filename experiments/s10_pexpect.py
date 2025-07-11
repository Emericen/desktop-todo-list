# import sys
# import pexpect


# shell = "powershell.exe" if sys.platform.startswith("win") else "bash"
# term = pexpect.spawn(shell, encoding="utf-8")


# def run(cmd, timeout=60):
#     # marker = f"__DONE_{time.time() * 1000}__"
#     term.sendline(cmd)
#     term.expect(marker, timeout=timeout)
#     # full output up to (but not including) the marker
#     output = term.before
#     # exit_code = int(term.readline().strip())  # reads the $? echoed after marker
#     return output


# # out, code = run(f"cd {pathlib.Path('my/project')} && npm run dev", 10)
# cmd = "cd ~/desktop/workfile/assistant-ui/desktop"
# print(f"> {cmd}")
# out = run(cmd, 10)
# print(f"out.length: {len(out)}")

# print("--------------------------------")

# cmd = "npm run dev"
# print(f"> {cmd}")
# out = run(cmd, 10)
# print(f"out.length: {len(out)}")
# print("--------------------------------")

# term.close()  # or keep it alive for the next command

import pexpect

shell = pexpect.spawn('bash')
shell.sendline('ls')   
# shell.sendline('x=500')
shell.expect(r'\$ ') 
print(shell.before) 

