```js
A backtick in the info string is not a fence: ` ```js ` starts a plain fence.
```

~~~~
Four tildes close a three-tilde block only at the same or greater length.
~~~

```md
A fence nested inside a fence:
```
still inside the outer fence
```
```

    An indented code block needs four spaces and no fence at all.
