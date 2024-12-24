import sqlite3
from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

# 連接到 SQLite 資料庫（或創建一個新資料庫）
def get_db():
    conn = sqlite3.connect('users.db')
    return conn

# 創建資料庫和用戶表
def create_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        username TEXT,
                        password TEXT
                    )''')
    cursor.execute('INSERT INTO users (username, password) VALUES ("admin", "password123")')
    conn.commit()
    conn.close()

create_db()  # 初始化資料庫和用戶表

# 首頁
@app.route('/')
def home():
    return redirect('/login')

# 登入頁面
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # 模擬SQL查詢，這裡存在SQL注入漏洞
        conn = get_db()
        cursor = conn.cursor()
        query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
        cursor.execute(query)
        result = cursor.fetchone()
        conn.close()

        if result:
            return redirect(url_for('flag'))  # 登入成功，顯示flag
        else:
            return 'Login Failed'

    return '''
        <form method="POST">
            Username: <input type="text" name="username"><br>
            Password: <input type="password" name="password"><br>
            <input type="submit" value="Login">
        </form>
    '''

# 顯示flag的頁面
@app.route('/flag')
def flag():
    return "FLAG{SQL_INJECTION_SUCCESS}"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
