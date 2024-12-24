from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

# 假設的用戶名和密碼（原本應該從資料庫獲取）
USERNAME = "admin"
PASSWORD = "password123"
FLAG = "FLAG{SQL_INJECTION_SUCCESS}"

@app.route('/')
def home():
    return redirect('/login')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # 模擬 SQL 查詢，這裡故意存在 SQL 注入漏洞
        if username == USERNAME and password == PASSWORD:
            return f"Welcome {username}! Here is your flag: {FLAG}"

        # 錯誤的帳號或密碼
        return "Login failed! Try again."

    # 顯示登錄頁面
    return render_template_string("""
    <h1>Login</h1>
    <form method="POST">
        <label for="username">Username:</label><br>
        <input type="text" id="username" name="username"><br><br>
        <label for="password">Password:</label><br>
        <input type="password" id="password" name="password"><br><br>
        <input type="submit" value="Login">
    </form>
    """)

if __name__ == '__main__':
    app.run(debug=True)
