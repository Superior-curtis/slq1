from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

# 模擬的用戶資料庫，這裡只做簡單的字典模擬
users = {
    'admin': 'password123'  # 用戶名: 密碼
}

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
        
        # 模擬SQL查詢，這裡有SQL Injection的漏洞
        if users.get(username) == password:
            return redirect(url_for('flag'))  # 成功登入，顯示flag
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
