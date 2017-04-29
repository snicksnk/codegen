# codegen

- Install yarn https://yarnpkg.com/en/docs/install
- $yarn install
- $yarn dev

# running

To run on some testing data, do `yarn start`.

# syntax

The syntax of schema (its in file, for now) is as follows:

```
// this comment will go to output
class {% name %} {
    {%
        // this comment will NOT got to output
        // v-- this call will be evaluated
        capabilities.map(method =>
        %{
            {% method %}() {
                throw new Error("{% name %}.{% method %}: not yet defined")
            }
        }%)
    %}
}
```

The `{%` and `%}` are bracets around code parts. Each code part should evaluate to iolist.

Iolist is a string or an array of iolists.

Hint:
- 'abc'
- ['ab', 'cd']
- ['a', ['b', ['c'], 'd'], 'e']

are valid iolists.

The `%{` and `}%` are bracets around text parts in the code. They act as quotes, but you don't need to escape things inside.

The schema `abc {% qyz %} def` will be turned into `'abc' + qyz + 'def'` line and then it will be `eval()`'d.

The schema `abc {% qyz(%{ lol }%) %} def` will be turned into `'abc' + qyz('lol') + 'def'`.
